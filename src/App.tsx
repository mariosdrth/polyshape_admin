import { useState } from "react";
import PublicationsList from "./components/PublicationsList";
import ProjectsList from "./components/ProjectsList";
import Tabs from "./components/Tabs";

function App() {
  const [active, setActive] = useState("publications");
  const tabs = [
    { key: "publications", label: "Publications", content: <PublicationsList /> },
    { key: "projects", label: "Projects", content: <ProjectsList /> },
  ];
  return (
    <div className="app">
      <h1 className="app-title">Polyshape Admin</h1>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}

export default App;
