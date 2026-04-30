import { useState } from "react";
import "./App.css";

function App() {
  const [foods, setFoods] = useState([
    {
      id: 1,
      name: "Spicy Dragon Burger",
      description: "A beef burger with chilli mayo, crispy onions and melted cheese.",
      category: "Burger",
      upvotes: 5,
      downvotes: 1,
    },
    {
      id: 2,
      name: "Garlic Volcano Pizza",
      description: "A pizza covered with garlic butter, mozzarella and spicy pepperoni.",
      category: "Pizza",
      upvotes: 3,
      downvotes: 0,
    },
  ]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Burger");

  function addFood(event) {
    event.preventDefault();

    if (name.trim() === "" || description.trim() === "") {
      alert("Please enter a food name and description.");
      return;
    }

    const newFood = {
      id: Date.now(),
      name: name,
      description: description,
      category: category,
      upvotes: 0,
      downvotes: 0,
    };

    setFoods([newFood, ...foods]);

    setName("");
    setDescription("");
    setCategory("Burger");
  }

  function upvoteFood(id) {
    setFoods(
      foods.map((food) =>
        food.id === id ? { ...food, upvotes: food.upvotes + 1 } : food
      )
    );
  }

  function downvoteFood(id) {
    setFoods(
      foods.map((food) =>
        food.id === id ? { ...food, downvotes: food.downvotes + 1 } : food
      )
    );
  }

  function getScore(food) {
    return food.upvotes - food.downvotes;
  }

  const leaderboard = [...foods].sort((a, b) => getScore(b) - getScore(a));

  return (
    <div className="app">
      <header>
        <h1>Flavortown Food Battle</h1>
        <p>Submit food ideas, vote for your favourites, and climb the leaderboard.</p>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>Create a Food</h2>

          <form onSubmit={addFood} className="food-form">
            <label>Food name</label>
            <input
              type="text"
              placeholder="e.g. Spicy Dragon Burger"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <label>Description</label>
            <textarea
              placeholder="Describe your food idea..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <label>Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Burger</option>
              <option>Pizza</option>
              <option>Noodles</option>
              <option>Dessert</option>
              <option>Drink</option>
              <option>Other</option>
            </select>

            <button type="submit">Submit Food</button>
          </form>
        </section>

        <section className="panel">
          <h2>Food Feed</h2>

          {foods.map((food) => (
            <div className="food-card" key={food.id}>
              <h3>{food.name}</h3>
              <p>{food.description}</p>
              <span className="category">{food.category}</span>

              <div className="vote-row">
                <button onClick={() => upvoteFood(food.id)}> {food.upvotes}</button>
                <button onClick={() => downvoteFood(food.id)}> {food.downvotes}</button>
                <strong>Score: {getScore(food)}</strong>
              </div>
            </div>
          ))}
        </section>

        <section className="panel">
          <h2>Leaderboard</h2>

          {leaderboard.map((food, index) => (
            <div className="leaderboard-item" key={food.id}>
              <strong>#{index + 1}</strong>
              <span>{food.name}</span>
              <span>{getScore(food)} pts</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;