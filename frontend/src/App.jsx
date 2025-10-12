import React from "react";
import ChooseRole from "./components/ChooseRole"; // make sure path is correct
import EventList from "./components/EventList"; // make sure path is correct
import WelcomePage from "./components/WelcomePage";

function App() {
  return (
    <div>
      <WelcomePage />
      <EventList />
    </div>
  );
}

export default App;