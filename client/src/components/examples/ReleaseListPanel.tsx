import ReleaseListPanel from "../ReleaseListPanel";

export default function ReleaseListPanelExample() {
  return (
    <div className="h-screen">
      <ReleaseListPanel
        onReleaseClick={(id) => console.log("Release clicked:", id)}
      />
    </div>
  );
}
