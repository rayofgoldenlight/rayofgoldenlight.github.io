import { createSignal } from "solid-js";

export default function Projects() {
  const [projects] = createSignal([
    { name: "Portfolio Website", description: "Built with SolidJS, HTML, CSS, JS" },
    { name: "Project B", description: "Another cool project" }
  ]);

  return (
    <section id="projects" class="section">
      <h2>Projects</h2>
      <ul>
        {projects().map((p) => (
          <li>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
