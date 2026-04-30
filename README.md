# Flavortown Food Battle

Flavortown Food Battle is a community food-voting web app where users can submit creative dish ideas, vote on other people’s submissions, leave comments, and compete for a place on the leaderboard.

The project is built with React, Vite, Firebase, and Vercel. It was designed as a small but complete web app with real-time database updates, user interaction, moderation tools, and a live public deployment.

## Features

- Submit a dish with a name, description, and category
- View all submitted dishes in a live food feed
- Upvote and downvote dishes
- Change your vote from upvote to downvote, or from downvote to upvote
- View a leaderboard ranked by score
- Top three dishes appear in a podium section
- Filter dishes by category
- Leave short comments under dishes
- Admin users can delete dishes and comments
- Basic banned-word filter blocks inappropriate submissions and comments
- Normal users are limited to three dish submissions per hour
- Admin users can post and vote without limits
- Data is stored in Firebase Firestore
- The app is hosted on Vercel

## Tech Stack

- React
- Vite
- Firebase Firestore
- Firebase Authentication
- Vercel
- CSS

## How It Works

Users are signed in anonymously using Firebase Authentication. This allows the app to track voting history and submission limits without requiring users to create accounts.

Dish submissions are saved in Firebase Firestore. Each dish stores its name, description, category, vote counts, comments, creation time, and author ID.

Votes are also tracked per user. Normal users can vote once per dish, but they can change their vote later. For example, if a user changes from an upvote to a downvote, the app removes one upvote and adds one downvote.

The leaderboard is calculated by using:

```text
score = upvotes - downvotes
```
The highest-scoring dishes appear at the top of the leaderboard.

##Categories

Users can filter the food feed by:

- All
- Burger
- Pizza
- Noodles
- Dessert
- Drink
- Other

Admin Mode

The app includes a prototype admin mode. Admin users can:

Submit unlimited dishes
Vote unlimited times
Delete dishes
Delete comments

The admin password is stored as an environment variable.

This admin system is suitable for a prototype, but it is not fully secure for a production app because frontend environment variables can still be exposed in the browser.

##Moderation

The app uses a basic banned-word filter to block inappropriate language in dish submissions and comments.

This was chosen instead of an external moderation API to keep the project easier to deploy and more reliable as a prototype.

##Run locally

To Install dependencies:
```bash
npm install
```
Run the development server:
```bash
npm run dev
```
Open the local link shown in the terminal, usually:
```bash
http://localhost:5173
```

Build

To build the project:
```bash
npm run build
```


