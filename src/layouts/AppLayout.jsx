import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background">
      <Outlet />
    </div>
  );
}