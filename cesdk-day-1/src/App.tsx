import DesignEditor from './DesignEditor';
import './App.css';

function App() {
  const hasLicense = Boolean(
    import.meta.env.VITE_CESDK_LICENSE_KEY || import.meta.env.VITE_CESDK_LICENSE,
  );

  if (!hasLicense) {
    return (
      <div className="license-banner">
        <h1>cesdk-day-1</h1>
        <p>
          Set <code>VITE_CESDK_LICENSE</code> (or <code>VITE_CESDK_LICENSE_KEY</code>)
          in a local <code>.env</code> file (see <code>.env.example</code>), then
          restart <code>npm run dev</code>.
        </p>
        <p>
          Get a trial key from IMG.LY. Never commit the real key.
        </p>
      </div>
    );
  }

  return <DesignEditor />;
}

export default App;
