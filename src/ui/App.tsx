import { CollectionProvider } from "../state/collection";
import { MixtapeProvider } from "../state/mixtapes";
import { Shell } from "./Shell";

export function App() {
  return (
    <CollectionProvider>
      <MixtapeProvider>
        <Shell />
      </MixtapeProvider>
    </CollectionProvider>
  );
}
