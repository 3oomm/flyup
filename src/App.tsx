import Router from "./routes/Router";
import AppErrorBoundary from "./components/AppErrorBoundary";

const App = () => {
  return (
    <AppErrorBoundary>
      <Router />
    </AppErrorBoundary>
  )
}

export default App
