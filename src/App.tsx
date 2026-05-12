import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ListsPage } from "./pages/ListsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { GroceryListsProvider } from "./context/GroceryListsContext";
import { UserSettingsProvider } from "./context/UserSettingsContext";
import { UserLocationProvider } from "./context/UserLocationContext";

export default function App() {
  return (
    <BrowserRouter>
      <UserSettingsProvider>
        <UserLocationProvider>
          <GroceryListsProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </GroceryListsProvider>
        </UserLocationProvider>
      </UserSettingsProvider>
    </BrowserRouter>
  );
}
