import './App.css';
import Header from "./components/header/Header";
import Home from "./components/home/Home";
import React from "react";

function App() {
  return (
   <>
     <Header />
       <main className="main">
           <Home />
       </main>
   </>
  );
}

export default App;
