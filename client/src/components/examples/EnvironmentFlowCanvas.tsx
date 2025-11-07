import EnvironmentFlowCanvas from "../EnvironmentFlowCanvas";

export default function EnvironmentFlowCanvasExample() {
  return (
    <div className="h-screen w-full">
      <EnvironmentFlowCanvas
        onEnvironmentClick={(envId) => console.log("Environment clicked:", envId)}
      />
    </div>
  );
}
