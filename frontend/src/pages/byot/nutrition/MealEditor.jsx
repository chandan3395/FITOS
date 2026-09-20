import { button, input, format, newFood, newMeal, nutrients, totals } from "./nutritionUtils";
export default function MealEditor({ meals, onChange }) {
  function update(index, value) {
    onChange(meals.map((meal, i) => (i === index ? value : meal)));
  }
  function move(index, delta) {
    const next = [...meals];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary">Enter nutrition values for the full serving.</p>
      {!meals.length && (
        <p className="rounded-xl border border-dashed border-border p-5 text-text-secondary">
          No meals yet. Add a meal and enter the foods yourself.
        </p>
      )}
      {meals.map((meal, index) => (
        <section
          key={meal.id}
          className="border border-border bg-card rounded-2xl p-4 space-y-4"
          aria-label={`Meal ${index + 1}`}
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm flex-1 min-w-[130px] max-w-md">
              Meal name
              <input
                className={input}
                required
                maxLength={80}
                value={meal.name}
                onChange={(e) => update(index, { ...meal, name: e.target.value })}
              />
            </label>
            <button
              type="button"
              className={button}
              aria-label={`Move meal ${index + 1} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={button}
              aria-label={`Move meal ${index + 1} down`}
              disabled={index === meals.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={`${button} text-danger hover:bg-red-50`}
              onClick={() => {
                if (window.confirm("Remove this meal and its foods? Save to apply the removal."))
                  onChange(meals.filter((_, i) => i !== index));
              }}
            >
              Remove meal
            </button>
          </div>
          {meal.foods.map((food, foodIndex) => (
            <fieldset key={food.id} className="bg-bg rounded-xl p-3 border border-border space-y-3">
              <legend className="text-sm px-1">Food {foodIndex + 1}</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  Food name
                  <input
                    className={input}
                    required
                    maxLength={120}
                    value={food.name}
                    onChange={(e) =>
                      update(index, {
                        ...meal,
                        foods: meal.foods.map((item, i) =>
                          i === foodIndex ? { ...item, name: e.target.value } : item
                        ),
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  Quantity / serving
                  <input
                    className={input}
                    required
                    maxLength={100}
                    placeholder="200 g or 2 eggs"
                    value={food.quantity}
                    onChange={(e) =>
                      update(index, {
                        ...meal,
                        foods: meal.foods.map((item, i) =>
                          i === foodIndex ? { ...item, quantity: e.target.value } : item
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {nutrients.map(([key, label, unit]) => (
                  <label key={key} className="text-sm min-w-0">
                    {label} ({unit})
                    <input
                      className={input}
                      type="number"
                      required
                      min="0"
                      max={key === "calories" ? 10000 : 2000}
                      step="0.01"
                      value={food[key]}
                      onChange={(e) =>
                        update(index, {
                          ...meal,
                          foods: meal.foods.map((item, i) =>
                            i === foodIndex ? { ...item, [key]: e.target.value } : item
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className={`${button} text-danger hover:bg-red-50`}
                onClick={() => {
                  if (window.confirm("Remove this food? Save to apply the removal."))
                    update(index, { ...meal, foods: meal.foods.filter((_, i) => i !== foodIndex) });
                }}
              >
                Remove food
              </button>
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              className={button}
              disabled={meal.foods.length >= 20}
              onClick={() => update(index, { ...meal, foods: [...meal.foods, newFood()] })}
            >
              Add food
            </button>
            <p className="text-sm text-text-secondary">
              Meal preview:{" "}
              {nutrients
                .map(
                  ([key, , unit]) =>
                    `${format(totals([meal])[key])} ${unit}${key === "calories" ? "" : ` ${key}`}`
                )
                .join(" · ")}
            </p>
          </div>
        </section>
      ))}
      <button
        type="button"
        className={button}
        disabled={meals.length >= 12}
        onClick={() => onChange([...meals, newMeal()])}
      >
        Add meal
      </button>
    </div>
  );
}
