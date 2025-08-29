import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function App() {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
    </div>
  );
}

render(() => <App />, document.getElementById("root"));