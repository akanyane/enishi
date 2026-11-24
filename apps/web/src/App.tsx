import { useSession } from "./lib/session";
import AuthScreen from "./components/AuthScreen";
import ContactsApp from "./components/ContactsApp";

export default function App() {
  const { user } = useSession();
  // Each screen renders its own `.fx` root (the contacts screen needs `data-pane` on it).
  return <div className="fx-wrap">{user ? <ContactsApp key={user.id} /> : <AuthScreen />}</div>;
}
