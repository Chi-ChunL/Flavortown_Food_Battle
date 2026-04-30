import "./App.css";
import foodBg from './assets/food-banner.png';
import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, getDoc, setDoc
} from "firebase/firestore";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

function App() {
  const [foods, setFoods] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Burger");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [votedItems, setVotedItems] = useState({});
  const [canSubmit, setCanSubmit] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "foods"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setFoods(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function checkSubmitCooldown() {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const lastSubmit = snap.data().lastSubmit?.toMillis();
        if (lastSubmit && Date.now() - lastSubmit < 60 * 60 * 1000) {
          setCanSubmit(false);
        } else {
          setCanSubmit(true);
        }
      }
    }

    async function loadVotes() {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().votes) {
        setVotedItems(snap.data().votes);
      }
    }

    checkSubmitCooldown();
    loadVotes();
  }, [user]);

  async function addFood() {
    if (!user) return;
    if (!canSubmit) {
      alert("You can only submit one dish per hour!");
      return;
    }
    if (name.trim() === "" || description.trim() === "") {
      alert("Please enter a food name and description.");
      return;
    }

    const cleanName = name.trim().slice(0, 60);
    const cleanDesc = description.trim().slice(0, 200);

    const toxicityScore = await checkToxicity(`${cleanName} ${cleanDesc}`);
    if (toxicityScore > 0.7) {
      alert("Your submission was flagged as inappropriate. Please keep it food related!");
      return;
    }

    await addDoc(collection(db, "foods"), {
      name: cleanName,
      description: cleanDesc,
      category,
      upvotes: 0,
      downvotes: 0,
      createdAt: serverTimestamp(),
      authorId: user.uid,
    });

    await setDoc(doc(db, "users", user.uid), {
      lastSubmit: serverTimestamp(),
    }, { merge: true });

    setCanSubmit(false);
    setName("");
    setDescription("");
    setCategory("Burger");
  }

  async function vote(id, dir) {
    if (!user) return;
    if (votedItems[id]) {
      alert("You've already voted on this dish!");
      return;
    }

    const food = foods.find((f) => f.id === id);
    const ref = doc(db, "foods", id);

    if (dir === 1) {
      await updateDoc(ref, { upvotes: food.upvotes + 1 });
    } else {
      await updateDoc(ref, { downvotes: food.downvotes + 1 });
    }

    const newVotes = { ...votedItems, [id]: dir };
    setVotedItems(newVotes);

    await setDoc(doc(db, "users", user.uid), {
      votes: newVotes,
    }, { merge: true });
  }

  async function deleteFood(id) {
    await deleteDoc(doc(db, "foods", id));
  }

  function adminLogin() {
    const password = prompt("Enter admin password:");
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert("Wrong password!");
    }
  }
  async function checkToxicity(text) {
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${import.meta.env.VITE_PERSPECTIVE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: { text },
          languages: ["en"],
          requestedAttributes: { TOXICITY: {} },
        }),
      }
    );
    const data = await response.json();
    return data.attributeScores.TOXICITY.summaryScore.value;
  }
  function score(f) { return f.upvotes - f.downvotes; }

  const leaderboard = [...foods].sort((a, b) => score(b) - score(a));

  return (
    <div className="fb-root">
      <div className="fb-hero" style={{ backgroundImage: `url(${foodBg})` }}>
        <div className="fb-hero-eyebrow">Community voting</div>
        <h1>Flavortown<br />Food Battle</h1>
        <p>Submit ideas, vote for favourites, claim the top spot.</p>
        {!isAdmin ? (
          <button onClick={adminLogin} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
            Admin
          </button>
        ) : (
          <span style={{ marginTop: '1rem', display: 'inline-block', fontSize: '11px', color: '#ef9f27' }}>Admin mode on</span>
        )}
      </div>

      <div className="fb-layout">
        <div className="fb-panel">
          <div className="fb-panel-header"><h2>Submit a dish</h2></div>
          <div className="fb-form">
            <div className="fb-field">
              <label>Food name</label>
              <input type="text" placeholder="e.g. Spicy Dragon Burger" value={name} onChange={(e) => setName(e.target.value)} disabled={!canSubmit} maxLength={60} />
            </div>
            <div className="fb-field">
              <label>Description</label>
              <textarea placeholder="Describe your food idea..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canSubmit} maxLength={200} />
            </div>
            <div className="fb-field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canSubmit}>
                <option>Burger</option>
                <option>Pizza</option>
                <option>Noodles</option>
                <option>Dessert</option>
                <option>Drink</option>
                <option>Other</option>
              </select>
            </div>
            <button className="fb-submit-btn" onClick={addFood} disabled={!canSubmit}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {canSubmit ? "Submit dish" : "Come back in an hour"}
            </button>
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
                    <button
                      className={`fb-vote-btn up ${votedItems[f.id] === 1 ? "voted" : ""}`}
                      onClick={() => vote(f.id, 1)}
                      disabled={!!votedItems[f.id]}
                      style={{ opacity: votedItems[f.id] ? 0.5 : 1 }}>
                      ↑ {f.upvotes}
                    </button>
                    <button
                      className={`fb-vote-btn down ${votedItems[f.id] === -1 ? "voted" : ""}`}
                      onClick={() => vote(f.id, -1)}
                      disabled={!!votedItems[f.id]}
                      style={{ opacity: votedItems[f.id] ? 0.5 : 1 }}>
                      ↓ {f.downvotes}
                    </button>
                    <span className={`fb-score ${score(f) > 0 ? "fb-score-positive" : ""}`}>
                      {score(f) > 0 ? "+" : ""}{score(f)} pts
                    </span>
                    {votedItems[f.id] && (
                      <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '4px' }}>voted</span>
                    )}
                    {isAdmin && (
                      <button onClick={() => deleteFood(f.id)} style={{ marginLeft: 'auto', background: '#fee2e2', border: 'none', color: '#a32d2d', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}>
                        Delete
                      </button>
                    )}
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