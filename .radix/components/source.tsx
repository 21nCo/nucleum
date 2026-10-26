import { useEffect, useRef, useState } from "react";

// Binds a value in the project's source to a component, both ways. Changing
// the value writes it into the file, and editing the file changes the value.
//
//   const [accent, setAccent, error] = useSource("src/theme.css", /--accent:\s*(#[0-9a-f]{6})/i);
//
//   <input type="color" value={accent ?? "#000000"} onChange={(e) => setAccent(e.target.value)} />
//
// The pattern's first group is the value. The pattern has to match exactly
// once in the file, so anchor it on the declaration and not the value alone.
// Anything else is an error, and nothing is written.
//
// The value is the text in the file. parse and format convert it, for a
// number or a boolean:
//
//   useSource("src/config.ts", /const SPEED = (\d+)/, { parse: Number, format: String });

const WRITE_DELAY = 150;

type Options<T> = {
  parse?: (text: string) => T;
  format?: (value: T) => string;
};

// Every write is a read, an edit and a write. Two bindings on the same file
// must take turns, or the second write undoes the first.
const queues = new Map<string, Promise<unknown>>();

function inTurn<T>(file: string, work: () => Promise<T>) {
  const result = (queues.get(file) ?? Promise.resolve()).then(work);
  queues.set(file, result.catch(() => {}));
  return result;
}

// Where the pattern's first group is in the text.
function find(text: string, pattern: RegExp, file: string) {
  const flags = pattern.flags.replace(/[gd]/g, "") + "gd";
  const matches = [...text.matchAll(new RegExp(pattern.source, flags))];

  if (matches.length === 0) throw new Error(`${pattern} is not in ${file}`);
  if (matches.length > 1) {
    throw new Error(`${pattern} matches ${matches.length} places in ${file}, make it more specific`);
  }

  const group = matches[0].indices?.[1];
  if (!group) throw new Error(`${pattern} needs a group around the value`);
  return { start: group[0], end: group[1], value: matches[0][1] };
}

export function useSource<T = string>(file: string, pattern: RegExp, options: Options<T> = {}) {
  const parse = options.parse ?? ((text: string) => text as T);
  const format = options.format ?? String;

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A write waiting to go out, and a count of the edits made here. A read
  // that started before an edit is out of date by the time it comes back.
  const timer = useRef<number | undefined>(undefined);
  const edits = useRef(0);

  const fail = (reason: unknown) => {
    const message = String((reason as Error)?.message ?? reason);
    setError((current) => {
      if (current !== message) radix.report("binding", message, file);
      return message;
    });
  };

  useEffect(() => {
    let live = true;

    const load = () => {
      const started = edits.current;
      inTurn(file, () => radix.files.read(file))
        .then((contents) => {
          if (!live || started !== edits.current || timer.current !== undefined) return;
          setText(find(contents, pattern, file).value);
          setError(null);
        })
        .catch((reason) => live && fail(reason));
    };

    load();
    const stop = radix.files.subscribe((changed) => {
      if (changed.includes(file)) load();
    });
    return () => {
      live = false;
      stop();
    };
  }, [file, pattern.source, pattern.flags]);

  const set = (value: T) => {
    const next = format(value);
    edits.current += 1;
    setText(next);

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      inTurn(file, async () => {
        const contents = await radix.files.read(file);
        const at = find(contents, pattern, file);
        const updated = contents.slice(0, at.start) + next + contents.slice(at.end);

        // A value the pattern would not find again would leave the binding
        // with nothing to read, so it is refused, and the component goes back
        // to the value in the file.
        let fits = false;
        try {
          fits = find(updated, pattern, file).value === next;
        } catch {}
        if (!fits) {
          setText(at.value);
          throw new Error(`${JSON.stringify(next)} does not fit ${pattern} in ${file}`);
        }
        if (updated !== contents) await radix.files.write(file, updated);
        setError(null);
      }).catch(fail);
    }, WRITE_DELAY);
  };

  return [text === null ? undefined : parse(text), set, error] as const;
}
