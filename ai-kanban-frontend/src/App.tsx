import { useState } from "react";
import LoginPage from "./components/LoginPage";
import BoardApp from "./BoardApp";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return (
      <LoginPage
        brandName="Kanban"
        onSignIn={async (email, password) => {
          if (!email || !password) throw new Error("Missing credentials");
          setLoggedIn(true);
        }}
        onSignUp={async (email, password) => {
          if (!email || !password) throw new Error("Missing credentials");
          setLoggedIn(true);
        }}
      />
    );
  }

  return <BoardApp onLogout={() => setLoggedIn(false)} />;
}
