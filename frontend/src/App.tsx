import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Cars from "./pages/Cars";
import CarDetail from "./pages/CarDetail";
import Plans from "./pages/Plans";
import Sold from "./pages/Sold";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="cars" element={<Cars />} />
        <Route path="cars/:id" element={<CarDetail />} />
        <Route path="sold" element={<Sold />} />
        <Route path="plans" element={<Plans />} />
      </Route>
    </Routes>
  );
}
