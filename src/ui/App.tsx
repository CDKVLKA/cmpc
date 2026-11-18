import { CollectionProvider } from "../state/collection";
import { ListsProvider } from "../state/lists";
import { Shell } from "./Shell";

export function App() {
  return (
    <CollectionProvider>
      <ListsProvider>
        <Shell />
      </ListsProvider>
    </CollectionProvider>
  );
}
