"""Meal plan recommendation tool.

This script suggests a daily meal plan (breakfast, lunch, dinner, optional snack)
that aims for a balanced distribution of macronutrients while respecting
user-specified calorie targets and dietary preferences.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import product
from typing import Iterable, List, Optional, Sequence, Tuple
import argparse
import math
import textwrap


@dataclass(frozen=True)
class Meal:
    name: str
    meal_type: str  # breakfast, lunch, dinner, snack
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    vegetarian: bool
    description: str

    def macro_tuple(self) -> Tuple[int, int, int, int]:
        return (self.calories, self.protein_g, self.carbs_g, self.fat_g)


MEALS: Tuple[Meal, ...] = (
    # Breakfast options
    Meal(
        name="Oatmeal with Berries",
        meal_type="breakfast",
        calories=350,
        protein_g=15,
        carbs_g=55,
        fat_g=9,
        vegetarian=True,
        description="Steel-cut oats cooked in almond milk topped with blueberries "
        "and crushed almonds.",
    ),
    Meal(
        name="Greek Yogurt Parfait",
        meal_type="breakfast",
        calories=320,
        protein_g=22,
        carbs_g=38,
        fat_g=8,
        vegetarian=True,
        description="Greek yogurt layered with granola, kiwi, and honey.",
    ),
    Meal(
        name="Veggie Omelette",
        meal_type="breakfast",
        calories=310,
        protein_g=21,
        carbs_g=10,
        fat_g=18,
        vegetarian=True,
        description="Three-egg omelette with spinach, mushrooms, and feta.",
    ),
    Meal(
        name="Tofu Breakfast Bowl",
        meal_type="breakfast",
        calories=330,
        protein_g=23,
        carbs_g=28,
        fat_g=14,
        vegetarian=True,
        description="Scrambled tofu with quinoa, kale, and roasted sweet potatoes.",
    ),
    Meal(
        name="Smoked Salmon Toast",
        meal_type="breakfast",
        calories=360,
        protein_g=19,
        carbs_g=34,
        fat_g=17,
        vegetarian=False,
        description="Whole-grain toast topped with avocado, smoked salmon, and capers.",
    ),
    # Lunch options
    Meal(
        name="Grilled Chicken Grain Bowl",
        meal_type="lunch",
        calories=550,
        protein_g=42,
        carbs_g=55,
        fat_g=18,
        vegetarian=False,
        description="Brown rice with grilled chicken, roasted vegetables, and tahini drizzle.",
    ),
    Meal(
        name="Miso Glazed Salmon",
        meal_type="lunch",
        calories=520,
        protein_g=36,
        carbs_g=40,
        fat_g=24,
        vegetarian=False,
        description="Baked salmon with miso glaze, served with soba noodles and bok choy.",
    ),
    Meal(
        name="Lentil Power Salad",
        meal_type="lunch",
        calories=480,
        protein_g=24,
        carbs_g=52,
        fat_g=18,
        vegetarian=True,
        description="Green lentils, roasted beets, arugula, goat cheese, and walnuts.",
    ),
    Meal(
        name="Mediterranean Quinoa Bowl",
        meal_type="lunch",
        calories=500,
        protein_g=20,
        carbs_g=62,
        fat_g=16,
        vegetarian=True,
        description="Quinoa with chickpeas, cucumber, olives, tomatoes, and tzatziki.",
    ),
    Meal(
        name="Turkey Avocado Wrap",
        meal_type="lunch",
        calories=510,
        protein_g=34,
        carbs_g=48,
        fat_g=20,
        vegetarian=False,
        description="Whole-wheat wrap with turkey, avocado, spinach, and hummus.",
    ),
    # Dinner options
    Meal(
        name="Herb Roasted Chicken",
        meal_type="dinner",
        calories=610,
        protein_g=48,
        carbs_g=45,
        fat_g=24,
        vegetarian=False,
        description="Roasted chicken thighs with farro and roasted carrots.",
    ),
    Meal(
        name="Tofu Stir-Fry",
        meal_type="dinner",
        calories=540,
        protein_g=30,
        carbs_g=60,
        fat_g=18,
        vegetarian=True,
        description="Stir-fried tofu with broccoli, bell peppers, and brown rice.",
    ),
    Meal(
        name="Shrimp Pasta Primavera",
        meal_type="dinner",
        calories=590,
        protein_g=35,
        carbs_g=70,
        fat_g=18,
        vegetarian=False,
        description="Whole-grain pasta with shrimp, asparagus, peas, and lemon cream sauce.",
    ),
    Meal(
        name="Vegetable Curry",
        meal_type="dinner",
        calories=560,
        protein_g=19,
        carbs_g=75,
        fat_g=20,
        vegetarian=True,
        description="Chickpea and vegetable curry served with basmati rice.",
    ),
    Meal(
        name="Grilled Tempeh Tacos",
        meal_type="dinner",
        calories=530,
        protein_g=32,
        carbs_g=55,
        fat_g=16,
        vegetarian=True,
        description="Corn tortillas with grilled tempeh, cabbage slaw, and avocado salsa.",
    ),
    # Snack options
    Meal(
        name="Edamame and Fruit",
        meal_type="snack",
        calories=200,
        protein_g=13,
        carbs_g=22,
        fat_g=7,
        vegetarian=True,
        description="Steamed edamame with a side of sliced oranges.",
    ),
    Meal(
        name="Protein Smoothie",
        meal_type="snack",
        calories=230,
        protein_g=20,
        carbs_g=25,
        fat_g=7,
        vegetarian=True,
        description="Spinach, banana, pea protein, and peanut butter smoothie.",
    ),
    Meal(
        name="Hummus & Veggies",
        meal_type="snack",
        calories=210,
        protein_g=9,
        carbs_g=20,
        fat_g=11,
        vegetarian=True,
        description="Roasted red pepper hummus with cucumber and bell pepper sticks.",
    ),
    Meal(
        name="Yogurt with Nuts",
        meal_type="snack",
        calories=220,
        protein_g=15,
        carbs_g=18,
        fat_g=11,
        vegetarian=True,
        description="Plain yogurt topped with mixed nuts and a drizzle of maple syrup.",
    ),
)


def _group_meals(meals: Iterable[Meal], meal_type: str, vegetarian_only: bool) -> Tuple[Meal, ...]:
    return tuple(
        meal for meal in meals if meal.meal_type == meal_type and (meal.vegetarian or not vegetarian_only)
    )


def recommend_meal_plan(
    calorie_target: int = 2000,
    protein_ratio: float = 0.25,
    carb_ratio: float = 0.5,
    fat_ratio: float = 0.25,
    include_snack: bool = True,
    vegetarian_only: bool = False,
) -> Tuple[Tuple[Meal, ...], Tuple[int, int, int, int]]:
    """Return a tuple of meals approximating the desired nutritional profile."""
    if not math.isclose(protein_ratio + carb_ratio + fat_ratio, 1.0, rel_tol=1e-6):
        raise ValueError("macronutrient ratios must sum to 1.0")

    calorie_target = max(1200, min(3500, calorie_target))  # keep within reasonable bounds
    target_protein = int(calorie_target * protein_ratio / 4)
    target_carbs = int(calorie_target * carb_ratio / 4)
    target_fat = int(calorie_target * fat_ratio / 9)

    breakfasts = _group_meals(MEALS, "breakfast", vegetarian_only)
    lunches = _group_meals(MEALS, "lunch", vegetarian_only)
    dinners = _group_meals(MEALS, "dinner", vegetarian_only)
    snacks = _group_meals(MEALS, "snack", vegetarian_only)

    if not breakfasts or not lunches or not dinners:
        raise ValueError("Not enough meals to build a plan with the given preferences.")

    best_combo: Optional[Tuple[Meal, ...]] = None
    best_score = float("inf")

    def score_diff(total: Tuple[int, int, int, int]) -> float:
        calorie_diff = abs(total[0] - calorie_target) / calorie_target
        protein_diff = abs(total[1] - target_protein) / max(target_protein, 1)
        carb_diff = abs(total[2] - target_carbs) / max(target_carbs, 1)
        fat_diff = abs(total[3] - target_fat) / max(target_fat, 1)
        return calorie_diff + protein_diff + carb_diff + fat_diff

    def sum_macros(meals: Sequence[Meal]) -> Tuple[int, int, int, int]:
        calories = sum(meal.calories for meal in meals)
        protein = sum(meal.protein_g for meal in meals)
        carbs = sum(meal.carbs_g for meal in meals)
        fat = sum(meal.fat_g for meal in meals)
        return calories, protein, carbs, fat

    snack_options: Sequence[Tuple[Meal, ...]]
    if include_snack and snacks:
        snack_options = tuple((snack,) for snack in snacks) + (tuple(),)
    else:
        snack_options = (tuple(),)

    for combo in product(breakfasts, lunches, dinners, snack_options):
        selected_meals: Tuple[Meal, ...]
        if combo[-1]:
            selected_meals = combo[:-1] + combo[-1]
        else:
            selected_meals = combo[:-1]

        totals = sum_macros(selected_meals)
        diff = score_diff(totals)
        if diff < best_score:
            best_combo = selected_meals
            best_score = diff

    if best_combo is None:
        raise RuntimeError("Failed to compute a meal plan")

    totals = sum_macros(best_combo)
    return best_combo, totals


def format_meal_plan(meals: Sequence[Meal], totals: Tuple[int, int, int, int]) -> str:
    lines: List[str] = []
    lines.append("Recommended Meal Plan\n" + "=" * 23)
    for meal in meals:
        lines.append(f"\n{meal.meal_type.capitalize()}: {meal.name} ({meal.calories} kcal)")
        lines.append("  " + meal.description)
        lines.append(
            f"  Protein: {meal.protein_g} g  Carbs: {meal.carbs_g} g  Fat: {meal.fat_g} g"
        )
    lines.append("\nDaily Totals")
    lines.append("-" * 12)
    lines.append(
        f"Calories: {totals[0]} kcal\nProtein: {totals[1]} g\nCarbs: {totals[2]} g\nFat: {totals[3]} g"
    )
    return "\n".join(lines)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Suggest a nutritionally balanced daily meal plan.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              python meal_recommender.py --calories 2200 --diet vegetarian
              python meal_recommender.py --no-snack --protein 0.3 --fat 0.3 --carb 0.4
            """
        ),
    )
    parser.add_argument("--calories", type=int, default=2000, help="Daily calorie target (1200-3500)")
    parser.add_argument(
        "--protein", type=float, default=0.25, help="Protein ratio (fraction of total calories)"
    )
    parser.add_argument("--carb", type=float, default=0.5, help="Carbohydrate ratio")
    parser.add_argument("--fat", type=float, default=0.25, help="Fat ratio")
    parser.add_argument(
        "--diet",
        choices=("balanced", "vegetarian"),
        default="balanced",
        help="Dietary preference",
    )
    parser.add_argument(
        "--snack",
        dest="include_snack",
        action="store_true",
        default=True,
        help="Include a snack recommendation (default)",
    )
    parser.add_argument(
        "--no-snack",
        dest="include_snack",
        action="store_false",
        help="Do not include a snack recommendation",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    meals, totals = recommend_meal_plan(
        calorie_target=args.calories,
        protein_ratio=args.protein,
        carb_ratio=args.carb,
        fat_ratio=args.fat,
        include_snack=args.include_snack,
        vegetarian_only=args.diet == "vegetarian",
    )
    print(format_meal_plan(meals, totals))


if __name__ == "__main__":
    main()
