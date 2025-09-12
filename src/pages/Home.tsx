import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicationsList from "../components/PublicationsList";
import ProjectsList from "../components/ProjectsList";
import Tabs from "../components/Tabs";
import UserMenu from "../components/UserMenu";

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = useMemo(() => {
    const p = location.pathname || "/publications";
    if (p.startsWith("/projects")) return "projects";
    return "publications";
  }, [location.pathname]);
  const tabs = [
    { key: "publications", label: "Publications", content: <PublicationsList /> },
    { key: "projects", label: "Projects", content: <ProjectsList /> },
  ];

  return (
    <div className="app">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="app-title">Polyshape Admin</h1>
        <UserMenu />
      </header>
      <Tabs
        tabs={tabs}
        active={active}
        onChange={(key) => navigate(key === "projects" ? "/projects" : "/publications")}
      />
    </div>
  );
}

export default Home;
