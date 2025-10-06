"""標準ライブラリだけで動作する食事プランナーの簡易 Web UI."""
from __future__ import annotations

import argparse
import html
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from string import Template
from typing import Dict, List, Tuple
from urllib.parse import parse_qs

from meal_recommender import Meal, recommend_meal_plan

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE = Template((BASE_DIR / "templates" / "meal_plan.html").read_text(encoding="utf-8"))

MEAL_TYPE_LABELS: Dict[str, str] = {
    "breakfast": "朝食",
    "lunch": "昼食",
    "dinner": "夕食",
    "snack": "スナック",
}

DEFAULT_FORM_VALUES = {
    "calories": 2000,
    "diet": "balanced",
    "protein_ratio": 25,
    "carb_ratio": 50,
    "fat_ratio": 25,
    "include_snack": True,
}


def _meal_to_view(meal: Meal) -> Dict[str, object]:
    data = asdict(meal)
    data["meal_type_label"] = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type.title())
    return data


def _totals_to_view(totals: Tuple[int, int, int, int]) -> Dict[str, int]:
    return {
        "calories": totals[0],
        "protein": totals[1],
        "carbs": totals[2],
        "fat": totals[3],
    }


def _parse_percentage(value: str, field_label: str, errors: List[str]) -> Tuple[float, bool]:
    value = value.strip()
    if not value:
        errors.append(f"{field_label}を入力してください。")
        return 0.0, False
    try:
        percentage = float(value)
    except ValueError:
        errors.append(f"{field_label}は数値で入力してください。")
        return 0.0, False
    if percentage < 0:
        errors.append(f"{field_label}は 0 以上で入力してください。")
        return 0.0, False
    return percentage, True


def _parse_calories(value: str, errors: List[str]) -> Tuple[int, bool]:
    value = value.strip()
    if not value:
        errors.append("目標カロリーを入力してください。")
        return DEFAULT_FORM_VALUES["calories"], False
    try:
        calories = int(value)
    except ValueError:
        errors.append("目標カロリーは整数で入力してください。")
        return DEFAULT_FORM_VALUES["calories"], False
    if calories < 1200 or calories > 3500:
        errors.append("目標カロリーは 1200〜3500 の範囲で設定してください。")
        return calories, False
    return calories, True


def _build_form_values(params: Dict[str, List[str]]) -> Dict[str, object]:
    def first(key: str, default: str) -> str:
        values = params.get(key)
        return values[0] if values else default

    return {
        "calories": first("calories", str(DEFAULT_FORM_VALUES["calories"])),
        "diet": first("diet", DEFAULT_FORM_VALUES["diet"]),
        "protein_ratio": first("protein_ratio", str(DEFAULT_FORM_VALUES["protein_ratio"])),
        "carb_ratio": first("carb_ratio", str(DEFAULT_FORM_VALUES["carb_ratio"])),
        "fat_ratio": first("fat_ratio", str(DEFAULT_FORM_VALUES["fat_ratio"])),
        "include_snack": first("include_snack", "yes") != "no",
    }


def _format_errors(errors: List[str]) -> str:
    if not errors:
        return ""
    items = "".join(f"<li>{html.escape(message)}</li>" for message in errors)
    return (
        '<div class="error-list">'
        "<strong>入力内容を確認してください:</strong>"
        f"<ul>{items}</ul>"
        "</div>"
    )


def _build_meal_plan_section(meal_plan: Tuple[Meal, ...], totals: Tuple[int, int, int, int]) -> str:
    if not meal_plan:
        return ""

    cards: List[str] = []
    for meal in meal_plan:
        view = _meal_to_view(meal)
        cards.append(
            """
        <article class="meal-card">
          <div class="meal-heading">
            <h2>{meal_type}: {name}</h2>
            <span>{calories} kcal</span>
          </div>
          <p>{description}</p>
          <div class="macros">
            <span>たんぱく質 {protein} g</span>
            <span>炭水化物 {carbs} g</span>
            <span>脂質 {fat} g</span>
          </div>
        </article>
        """.format(
                meal_type=html.escape(str(view["meal_type_label"])),
                name=html.escape(view["name"]),
                calories=view["calories"],
                description=html.escape(view["description"]),
                protein=view["protein_g"],
                carbs=view["carbs_g"],
                fat=view["fat_g"],
            )
        )

    totals_view = _totals_to_view(totals)
    cards_html = "\n".join(cards)
    return (
        "<section class=\"meal-plan\">"
        "<h2>おすすめメニュー</h2>"
        f"{cards_html}"
        "<div class=\"totals\">"
        "<h2>1 日の合計</h2>"
        "<ul>"
        f"<li>カロリー: {totals_view['calories']} kcal</li>"
        f"<li>たんぱく質: {totals_view['protein']} g</li>"
        f"<li>炭水化物: {totals_view['carbs']} g</li>"
        f"<li>脂質: {totals_view['fat']} g</li>"
        "</ul>"
        "</div>"
        "</section>"
    )


def _render_page(form_values: Dict[str, object], meal_plan: Tuple[Meal, ...], totals: Tuple[int, int, int, int], errors: List[str]) -> str:
    substitutions = {
        "errors_block": _format_errors(errors),
        "calories_value": html.escape(str(form_values["calories"])),
        "diet_balanced_selected": "selected" if form_values["diet"] == "balanced" else "",
        "diet_vegetarian_selected": "selected" if form_values["diet"] == "vegetarian" else "",
        "protein_ratio_value": html.escape(str(form_values["protein_ratio"])),
        "carb_ratio_value": html.escape(str(form_values["carb_ratio"])),
        "fat_ratio_value": html.escape(str(form_values["fat_ratio"])),
        "snack_yes_selected": "selected" if form_values["include_snack"] else "",
        "snack_no_selected": "" if form_values["include_snack"] else "selected",
        "meal_plan_block": _build_meal_plan_section(meal_plan, totals),
    }
    return TEMPLATE.substitute(substitutions)


class MealPlannerHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: D401 - BaseHTTPRequestHandler interface
        meal_plan, totals = recommend_meal_plan()
        form_values = DEFAULT_FORM_VALUES.copy()
        page = _render_page(form_values, meal_plan, totals, [])
        self._send_html(page)

    def do_POST(self) -> None:  # noqa: D401 - BaseHTTPRequestHandler interface
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(content_length).decode("utf-8")
        params = parse_qs(body, keep_blank_values=True)

        if "reset" in params:
            meal_plan, totals = recommend_meal_plan()
            form_values = DEFAULT_FORM_VALUES.copy()
            page = _render_page(form_values, meal_plan, totals, [])
            self._send_html(page)
            return

        form_values = _build_form_values(params)
        errors: List[str] = []

        calories, calories_ok = _parse_calories(str(form_values["calories"]), errors)
        protein_pct, protein_ok = _parse_percentage(str(form_values["protein_ratio"]), "たんぱく質比率", errors)
        carb_pct, carb_ok = _parse_percentage(str(form_values["carb_ratio"]), "炭水化物比率", errors)
        fat_pct, fat_ok = _parse_percentage(str(form_values["fat_ratio"]), "脂質比率", errors)

        if calories_ok:
            form_values["calories"] = calories
        if protein_ok:
            form_values["protein_ratio"] = protein_pct
        if carb_ok:
            form_values["carb_ratio"] = carb_pct
        if fat_ok:
            form_values["fat_ratio"] = fat_pct

        total_pct = protein_pct + carb_pct + fat_pct
        if calories_ok and protein_ok and carb_ok and fat_ok and abs(total_pct - 100.0) > 0.5:
            errors.append("マクロ栄養素の比率は合計 100% になるように設定してください。")

        try:
            meal_plan, totals = recommend_meal_plan(
                calorie_target=calories if calories_ok else DEFAULT_FORM_VALUES["calories"],
                protein_ratio=(protein_pct / 100) if protein_ok else DEFAULT_FORM_VALUES["protein_ratio"] / 100,
                carb_ratio=(carb_pct / 100) if carb_ok else DEFAULT_FORM_VALUES["carb_ratio"] / 100,
                fat_ratio=(fat_pct / 100) if fat_ok else DEFAULT_FORM_VALUES["fat_ratio"] / 100,
                include_snack=form_values["include_snack"],
                vegetarian_only=form_values["diet"] == "vegetarian",
            )
        except ValueError as exc:
            errors.append(str(exc))
            meal_plan, totals = recommend_meal_plan()

        page = _render_page(form_values, meal_plan, totals, errors)
        self._send_html(page)

    def _send_html(self, html_text: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = html_text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - method name from base class
        return


def run_server(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), MealPlannerHandler)
    print(f"Serving meal planner UI on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start the meal planner web UI server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port number to listen on (default: 8000)")
    args = parser.parse_args()
    run_server(host=args.host, port=args.port)
