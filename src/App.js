import React from "react";
import './App.css';
import Header from "./components/header/Header";
import Home from "./components/home/Home";
import About from "./components/about/About";
import Skills from "./components/skills/Skills";
import Qualification from "./components/qualification/Qualification";
import Contact from "./components/contact/Contact";
import Footer from "./components/footer/Footer"
import ScrollUp from "./components/scrollup/scrollUp";
import Projects from "./components/projects/Projects";

function App() {
  return (
   <>
     <Header />
       <main className="main">
           <Home />
           <About />
           <Qualification />
           <Skills />
           <Projects />
           <Contact />
       </main>
       <Footer />
       <ScrollUp />
   </>
  );
}

export default App;
