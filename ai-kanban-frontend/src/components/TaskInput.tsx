import { useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export default function TagInput({ value, onChange, placeholder }: Props) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const add = (t: string) => {
    const tag = t.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
    setInput("");
  };
  const remove = (tag: string) => onChange(value.filter(t => t !== tag));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`remove ${tag}`} className="text-gray-500 hover:text-black">×</button>
          </span>
        ))}
      </div>
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(input); }
          if (e.key === "," || e.key === " ") {
            e.preventDefault(); add(input);
          }
          if (e.key === "Backspace" && !input && value.length) {
            remove(value[value.length - 1]);
          }
        }}
        placeholder={placeholder ?? "Add a tag and press Enter"}
        className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
      />
    </div>
  );
}
