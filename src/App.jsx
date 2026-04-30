import "./App.css";
import foodBg from "./assets/food-banner.png";
import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  setDoc,
  increment,
} from "firebase/firestore";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const categories = [
  "All",
  "Burger",
  "Pizza",
  "Noodles",
  "Dessert",
  "Drink",
  "Other",
];

const POST_LIMIT = 3;
const ONE_HOUR = 60 * 60 * 1000;

function App() {
  const [foods, setFoods] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Burger");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [votedItems, setVotedItems] = useState({});
  const [submissionTimes, setSubmissionTimes] = useState([]);
  const [canSubmit, setCanSubmit] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const foodsQuery = query(
      collection(db, "foods"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      foodsQuery,
      (snapshot) => {
        const loadedFoods = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setFoods(loadedFoods);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load foods:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function loadUserData() {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setVotedItems({});
          setSubmissionTimes([]);
          setCanSubmit(true);
          return;
        }

        const userData = userSnap.data();

        if (userData.votes) {
          setVotedItems(userData.votes);
        } else {
          setVotedItems({});
        }

        const allSubmissions = userData.submissions || [];
        const recentSubmissions = allSubmissions.filter(
          (time) => Date.now() - time < ONE_HOUR
        );

        setSubmissionTimes(recentSubmissions);
        setCanSubmit(recentSubmissions.length < POST_LIMIT);
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    }

    loadUserData();
  }, [user]);

  async function addFood() {
    if (!user) {
      alert("Please wait while the app connects.");
      return;
    }

    const recentSubmissions = submissionTimes.filter(
      (time) => Date.now() - time < ONE_HOUR
    );

    if (!isAdmin && recentSubmissions.length >= POST_LIMIT) {
      alert("You can only submit three dishes per hour!");
      setCanSubmit(false);
      return;
    }

    if (name.trim() === "" || description.trim() === "") {
      alert("Please enter a food name and description.");
      return;
    }

    const cleanName = name.trim().slice(0, 60);
    const cleanDescription = description.trim().slice(0, 200);

    try {
      setSubmitting(true);

      const toxicityScore = await checkToxicity(
        `${cleanName} ${cleanDescription}`
      );

      if (toxicityScore > 0.7) {
        alert(
          "Your submission was flagged as inappropriate. Please keep it food related!"
        );
        return;
      }

      await addDoc(collection(db, "foods"), {
        name: cleanName,
        description: cleanDescription,
        category,
        upvotes: 0,
        downvotes: 0,
        createdAt: serverTimestamp(),
        authorId: user.uid,
        postedByAdmin: isAdmin,
      });

      if (!isAdmin) {
        const updatedSubmissions = [...recentSubmissions, Date.now()];

        await setDoc(
          doc(db, "users", user.uid),
          {
            submissions: updatedSubmissions,
          },
          { merge: true }
        );

        setSubmissionTimes(updatedSubmissions);
        setCanSubmit(updatedSubmissions.length < POST_LIMIT);
      }

      setName("");
      setDescription("");
      setCategory("Burger");
    } catch (error) {
      console.error("Failed to submit dish:", error);
      alert("Something went wrong while submitting your dish.");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(id, direction) {
    if (!user) {
      alert("Please wait while the app connects.");
      return;
    }

    const food = foods.find((item) => item.id === id);

    if (!food) {
      alert("This dish could not be found.");
      return;
    }

    try {
      const foodRef = doc(db, "foods", id);

      if (isAdmin) {
        if (direction === 1) {
          await updateDoc(foodRef, {
            upvotes: increment(1),
          });
        } else {
          await updateDoc(foodRef, {
            downvotes: increment(1),
          });
        }

        return;
      }

      const previousVote = votedItems[id];

      if (previousVote === direction) {
        alert("You have already selected this vote.");
        return;
      }

      if (!previousVote) {
        if (direction === 1) {
          await updateDoc(foodRef, {
            upvotes: increment(1),
          });
        } else {
          await updateDoc(foodRef, {
            downvotes: increment(1),
          });
        }
      }

      if (previousVote === 1 && direction === -1) {
        await updateDoc(foodRef, {
          upvotes: increment(-1),
          downvotes: increment(1),
        });
      }

      if (previousVote === -1 && direction === 1) {
        await updateDoc(foodRef, {
          downvotes: increment(-1),
          upvotes: increment(1),
        });
      }

      const newVotes = {
        ...votedItems,
        [id]: direction,
      };

      setVotedItems(newVotes);

      await setDoc(
        doc(db, "users", user.uid),
        {
          votes: newVotes,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to vote:", error);
      alert("Something went wrong while voting.");
    }
  }

  async function deleteFood(id) {
    if (!isAdmin) {
      alert("You are not allowed to delete dishes.");
      return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this dish?");

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "foods", id));
    } catch (error) {
      console.error("Failed to delete dish:", error);
      alert("Something went wrong while deleting this dish.");
    }
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
    const apiKey = import.meta.env.VITE_PERSPECTIVE_API_KEY;

    if (!apiKey || apiKey === "YOUR_PERSPECTIVE_KEY") {
      console.warn("Perspective API key missing. Skipping toxicity check.");
      return 0;
    }

    try {
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: {
              text,
            },
            languages: ["en"],
            requestedAttributes: {
              TOXICITY: {},
            },
          }),
        }
      );

      const data = await response.json();

      return data?.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    } catch (error) {
      console.error("Toxicity check failed:", error);
      return 0;
    }
  }

  function score(food) {
    return (food.upvotes || 0) - (food.downvotes || 0);
  }

  const leaderboard = [...foods].sort((a, b) => score(b) - score(a));

  const filteredFoods =
    selectedCategory === "All"
      ? foods
      : foods.filter((food) => food.category === selectedCategory);

  const postsRemaining = isAdmin
    ? "Unlimited"
    : Math.max(0, POST_LIMIT - submissionTimes.length);

  const formDisabled = (!canSubmit && !isAdmin) || submitting;

  return (
    <div className="fb-root">
      <div className="fb-hero" style={{ backgroundImage: `url(${foodBg})` }}>
        <div className="fb-hero-eyebrow">Community voting</div>

        <h1>
          Flavortown
          <br />
          Food Battle
        </h1>

        <p>Submit ideas, vote for favourites, claim the top spot.</p>

        {!isAdmin ? (
          <button className="fb-admin-btn" onClick={adminLogin}>
            Admin
          </button>
        ) : (
          <span className="fb-admin-on">Admin mode on</span>
        )}
      </div>

      <div className="fb-layout">
        <div className="fb-panel">
          <div className="fb-panel-header">
            <h2>Submit a dish</h2>
          </div>

          <div className="fb-form">
            <p className="fb-submit-limit">
              Posts remaining this hour: {postsRemaining}
            </p>

            <div className="fb-field">
              <label>Food name</label>
              <input
                type="text"
                placeholder="e.g. Spicy Dragon Burger"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={formDisabled}
                maxLength={60}
              />
            </div>

            <div className="fb-field">
              <label>Description</label>
              <textarea
                placeholder="Describe your food idea..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={formDisabled}
                maxLength={200}
              />
            </div>

            <div className="fb-field">
              <label>Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={formDisabled}
              >
                <option>Burger</option>
                <option>Pizza</option>
                <option>Noodles</option>
                <option>Dessert</option>
                <option>Drink</option>
                <option>Other</option>
              </select>
            </div>

            <button
              className="fb-submit-btn"
              onClick={addFood}
              disabled={formDisabled}
            >
              {submitting
                ? "Checking..."
                : canSubmit || isAdmin
                ? "Submit dish"
                : "Post limit reached"}
            </button>
          </div>
        </div>

        <div className="fb-panel">
          <div className="fb-panel-header fb-feed-header">
            <div>
              <h2>Food feed</h2>
              <span className="fb-filter-status">
                Showing: {selectedCategory}
              </span>
            </div>

            <span className="fb-count-badge">{filteredFoods.length}</span>
          </div>

          <div className="fb-filter-row">
            {categories.map((item) => (
              <button
                key={item}
                className={`fb-filter-btn ${
                  selectedCategory === item ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="fb-feed">
            {loading ? (
              <div className="fb-empty">Loading dishes...</div>
            ) : filteredFoods.length === 0 ? (
              <div className="fb-empty">
                No dishes found for {selectedCategory}.
              </div>
            ) : (
              filteredFoods.map((food) => {
                const currentVote = votedItems[food.id];

                return (
                  <div className="fb-card" key={food.id}>
                    <div className="fb-card-top">
                      <h3>{food.name}</h3>
                      <span className="fb-cat-pill">{food.category}</span>
                    </div>

                    <p className="fb-card-desc">{food.description}</p>

                    <div className="fb-vote-row">
                      <button
                        className={`fb-vote-btn up ${
                          currentVote === 1 ? "voted" : ""
                        }`}
                        onClick={() => vote(food.id, 1)}
                      >
                        ↑ {food.upvotes || 0}
                      </button>

                      <button
                        className={`fb-vote-btn down ${
                          currentVote === -1 ? "voted" : ""
                        }`}
                        onClick={() => vote(food.id, -1)}
                      >
                        ↓ {food.downvotes || 0}
                      </button>

                      <span
                        className={`fb-score ${
                          score(food) > 0 ? "fb-score-positive" : ""
                        }`}
                      >
                        {score(food) > 0 ? "+" : ""}
                        {score(food)} pts
                      </span>

                      {!isAdmin && currentVote === 1 && (
                        <span className="fb-voted-label">upvoted</span>
                      )}

                      {!isAdmin && currentVote === -1 && (
                        <span className="fb-voted-label">downvoted</span>
                      )}

                      {isAdmin && (
                        <button
                          className="fb-delete-btn"
                          onClick={() => deleteFood(food.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="fb-panel">
          <div className="fb-panel-header">
            <h2>Leaderboard</h2>
          </div>

          <div className="fb-board">
            {leaderboard.length === 0 ? (
              <div className="fb-empty">No dishes yet</div>
            ) : (
              <>
                <div className="fb-podium">
                  {leaderboard.slice(0, 3).map((food, index) => (
                    <div
                      className={`fb-podium-card fb-podium-${index + 1}`}
                      key={food.id}
                    >
                      <div className="fb-medal">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </div>

                      <div className="fb-podium-rank">#{index + 1}</div>

                      <h3>{food.name}</h3>
                      <p>{score(food)} pts</p>
                    </div>
                  ))}
                </div>

                {leaderboard.length > 3 && (
                  <div className="fb-rest-board">
                    {leaderboard.slice(3).map((food, index) => (
                      <div className="fb-rank-item" key={food.id}>
                        <span className="fb-rank-num">{index + 4}</span>
                        <span className="fb-rank-name">{food.name}</span>
                        <span className="fb-rank-pts">{score(food)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;