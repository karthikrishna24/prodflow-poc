import ReleaseCard from "../ReleaseCard";

export default function ReleaseCardExample() {
  return (
    <div className="w-72">
      <ReleaseCard
        id="1"
        name="Release 2025.11.07"
        version="v2.5.0"
        status="in_progress"
        progress={65}
        updatedAt="2 hours ago"
        onClick={() => console.log("Release clicked")}
      />
    </div>
  );
}
