// Import your project images
import portfolioImg from '../../assets/work1.jpg'; // Replace with your actual image path
import biometricImg from '../../assets/work2.jpg'; // Replace with your actual image path

export const projectsData = [
    {
        id: 1,
        image: portfolioImg,
        title: "Portfolio Website",
        description: "Designed and developed a fully responsive, single-page portfolio website using React.js to showcase professional skills, projects, and achievements. Implemented dynamic rendering and reusable components to ensure maintainability and scalability. Achieved 100% performance and accessibility scores.",
        technologies: ["React.js", "HTML5", "CSS3", "JavaScript", "Netlify"],
        github: "https://github.com/mayeen/portfolio-website",
        demo: "https://kazishahriar.netlify.app/"
    },
    {
        id: 2,
        image: biometricImg,
        title: "Biometric Authenticator App",
        description: "Integrated fingerprint sensor SDKs and image-based authentication for secure user verification. Conducted a comparative analysis of leading SDKs (Neurotech, Dermalog) to evaluate performance, accuracy, and scalability. Developed a custom authentication solution using ASP.NET and RESTful APIs to ensure seamless integration with existing systems. Achieved 80%+ accuracy in user authentication and reduced false positives by 15% through optimized algorithms.",
        technologies: ["C#", "ASP.NET", "Fingerprint Sensor SDKs", "Image-Based Authentication", "RESTful APIs"],
        github: "https://github.com/mayeen/NeurotechDemo"
    },
    {
        id: 3,
        image: portfolioImg,
        title: "E-Commerce Chatbot using Agentic AI",
        description: "Built an intelligent e-commerce chatbot powered by Agentic AI that assists users with product discovery, order tracking, and personalized recommendations. Leveraged large language models with autonomous agent workflows to handle multi-turn conversations, query product catalogs, and execute actions like adding items to cart or processing returns — all through natural language interaction.",
        technologies: ["Python", "LangChain", "OpenAI API", "FastAPI", "React.js", "Docker"],
        github: "https://github.com/mayeen/E-commerce-chatbot-with-Agentic-AI",
    },
];