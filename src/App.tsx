import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ListsPage } from "./pages/ListsPage";
import { GroceryListsProvider } from "./context/GroceryListsContext";

export default function App() {
  return (
    <BrowserRouter>
      <GroceryListsProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lists" element={<ListsPage />} />
          </Routes>
        </Layout>
      </GroceryListsProvider>
    </BrowserRouter>
  );
}
