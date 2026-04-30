import { useState } from "react";
import "./App.css";
import foodBg from './assets/food-banner.webp';

function App() {
  const [foods, setFoods] = useState([
    { id: 1, name: "Spicy Dragon Burger", description: "A beef burger with chilli mayo, crispy onions and melted cheese.", category: "Burger", upvotes: 5, downvotes: 1 },
    { id: 2, name: "Garlic Volcano Pizza", description: "A pizza covered with garlic butter, mozzarella and spicy pepperoni.", category: "Pizza", upvotes: 3, downvotes: 0 },
  ]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Burger");

  function addFood() {
    if (name.trim() === "" || description.trim() === "") {
      alert("Please enter a food name and description.");
      return;
    }
    setFoods([{ id: Date.now(), name, description, category, upvotes: 0, downvotes: 0 }, ...foods]);
    setName("");
    setDescription("");
    setCategory("Burger");
  }

  function vote(id, dir) {
    setFoods(foods.map((f) =>
      f.id !== id ? f : dir === 1
        ? { ...f, upvotes: f.upvotes + 1 }
        : { ...f, downvotes: f.downvotes + 1 }
    ));
  }

  function score(f) { return f.upvotes - f.downvotes; }

  const leaderboard = [...foods].sort((a, b) => score(b) - score(a));

  return (
    <div className="fb-root">
      <div className="fb-hero" style={{ backgroundImage: `url(${foodBg})` }}>
        <div className="fb-hero-eyebrow">Community voting</div>
        <h1>Flavortown<br />Food Battle</h1>
        <p>Submit ideas, vote for favourites, claim the top spot.</p>
      </div>

      <div className="fb-layout">
        <div className="fb-panel">
          <div className="fb-panel-header"><h2>Submit a dish</h2></div>
          <div className="fb-form">
            <div className="fb-field">
              <label>Food name</label>
              <input type="text" placeholder="e.g. Spicy Dragon Burger" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="fb-field">
              <label>Description</label>
              <textarea placeholder="Describe your food idea..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="fb-field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Burger</option>
                <option>Pizza</option>
                <option>Noodles</option>
                <option>Dessert</option>
                <option>Drink</option>
                <option>Other</option>
              </select>
            </div>
            <button className="fb-submit-btn" onClick={addFood}>Submit dish</button>
          </div>
        </div>

        <div className="fb-panel">
          <div className="fb-panel-header">
            <h2>Food feed</h2>
            <span className="fb-count-badge">{foods.length}</span>
          </div>
          <div className="fb-feed">
            {foods.map((f) => (
              <div className="fb-card" key={f.id}>
                <div className="fb-card-top">
                  <h3>{f.name}</h3>
                  <span className="fb-cat-pill">{f.category}</span>
                </div>
                <p className="fb-card-desc">{f.description}</p>
                <div className="fb-vote-row">
                  <button className="fb-vote-btn up" onClick={() => vote(f.id, 1)}>↑ {f.upvotes}</button>
                  <button className="fb-vote-btn down" onClick={() => vote(f.id, -1)}>↓ {f.downvotes}</button>
                  <span className={`fb-score ${score(f) > 0 ? "fb-score-positive" : ""}`}>
                    {score(f) > 0 ? "+" : ""}{score(f)} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fb-panel">
          <div className="fb-panel-header"><h2>Leaderboard</h2></div>
          <div className="fb-board">
            {leaderboard.length === 0 ? (
              <div className="fb-empty">No dishes yet</div>
            ) : (
              leaderboard.map((f, i) => (
                <div className="fb-rank-item" key={f.id}>
                  <span className={`fb-rank-num ${i === 0 ? "fb-rank-1" : ""}`}>{i + 1}</span>
                  <span className="fb-rank-name">{f.name}</span>
                  <span className="fb-rank-pts">{score(f)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;