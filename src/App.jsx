import "./App.css";
import foodBg from './assets/food-banner.png';
import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";

function App() {
  const [foods, setFoods] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Burger");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "foods"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setFoods(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function addFood() {
    if (name.trim() === "" || description.trim() === "") {
      alert("Please enter a food name and description.");
      return;
    }
    await addDoc(collection(db, "foods"), {
      name,
      description,
      category,
      upvotes: 0,
      downvotes: 0,
      createdAt: serverTimestamp(),
    });
    setName("");
    setDescription("");
    setCategory("Burger");
  }

  async function vote(id, dir) {
    const food = foods.find((f) => f.id === id);
    const ref = doc(db, "foods", id);
    if (dir === 1) {
      await updateDoc(ref, { upvotes: food.upvotes + 1 });
    } else {
      await updateDoc(ref, { downvotes: food.downvotes + 1 });
    }
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
            {loading ? (
              <div className="fb-empty">Loading dishes...</div>
            ) : foods.length === 0 ? (
              <div className="fb-empty">No dishes yet — add one!</div>
            ) : (
              foods.map((f) => (
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
              ))
            )}
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