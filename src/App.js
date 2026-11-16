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
import Certifications from "./components/certifications/Certifications";
import Languages from "./components/languages/Languages";

function App() {
  return (
   <>
     <Header />
       <main className="main">
           <Home />
           <About />
           <Qualification />
           <Skills />
           <Languages />
           <Certifications />
           <Projects />
           <Contact />
       </main>
       <Footer />
       <ScrollUp />
   </>
  );
}

export default App;
