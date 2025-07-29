// src/components/ui/button.jsx

export default function Button({ children, variant, onClick, className = "" }) {
  return (
    <button
      className={`
        px-4 py-2 rounded
        ${variant==="default" ? "bg-blue-500 text-white" : "bg-gray-200"}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </button>
  );
}