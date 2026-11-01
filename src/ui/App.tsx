import { CollectionProvider } from "../state/collection";
import { Shell } from "./Shell";

export function App() {
  return (
    <CollectionProvider>
      <Shell />
    </CollectionProvider>
  );
}
