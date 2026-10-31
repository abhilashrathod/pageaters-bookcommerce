'use client';

import { FieldDescription, FieldError, FieldLabel, useField, useFormFields } from '@payloadcms/ui';
import type { TextFieldClientProps } from 'payload';
import { useEffect, useRef, useState } from 'react';

import { KIND_BY_PAGE_TYPE } from '../commerce-kinds.ts';
import type { CommerceKind, CommerceOption } from '../commerce-kinds.ts';

// The admin input of a commerce id field (fields/commerce.ts): search the API's records by title (through the CMS's
// /api/commerce endpoint) and store the chosen record's id. `kind: 'by-type'` reads the kind from the sibling `type`
// select (an override's page type).

type Props = TextFieldClientProps & { kind: CommerceKind | 'by-type' };

const search = async (kind: CommerceKind, q: string, signal: AbortSignal): Promise<CommerceOption[]> => {
  const res = await fetch(`/api/commerce/${kind}?q=${encodeURIComponent(q)}`, { credentials: 'include', signal });
  if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? 'Search failed');
  return ((await res.json()) as { options: CommerceOption[] }).options;
};

export const CommercePicker = ({ field, path, readOnly, kind: configured }: Props) => {
  const { value, setValue, showError } = useField<string>({ path });
  const pageType = useFormFields(([fields]) => fields.type?.value as string | undefined);
  const kind = configured === 'by-type' ? KIND_BY_PAGE_TYPE[pageType ?? ''] : configured;

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CommerceOption[]>([]);
  const [chosen, setChosen] = useState<CommerceOption | undefined>();
  const [problem, setProblem] = useState('');

  // A new page type means another kind of record: the id picked for the old one no longer fits.
  const loadedKind = useRef(kind);
  useEffect(() => {
    if (loadedKind.current === kind) return;
    loadedKind.current = kind;
    setValue('');
    setChosen(undefined);
    setQuery('');
  }, [kind, setValue]);

  useEffect(() => {
    if (!kind) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(kind, query, controller.signal)
        .then((found) => {
          setOptions(found);
          setProblem('');
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setProblem(error instanceof Error ? error.message : 'Search failed');
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, query]);

  const label = chosen && chosen.id === value ? chosen.label : options.find((option) => option.id === value)?.label;

  return (
    <div className="field-type text">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <FieldError path={path} showError={showError} />
      <p>{value ? `Selected: ${label ?? value}` : 'Nothing selected yet'}</p>
      {kind ? (
        <>
          <input
            className="input"
            disabled={readOnly}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={kind === 'books' ? 'Type at least 2 letters of the title' : 'Filter by title'}
            type="search"
            value={query}
          />
          {problem ? <p role="alert">{problem}</p> : null}
          <ul style={{ listStyle: 'none', margin: '0.5rem 0', padding: 0 }}>
            {options.map((option) => (
              <li key={option.id}>
                <button
                  className="btn btn--style-subtle btn--size-small"
                  disabled={readOnly}
                  onClick={() => {
                    setChosen(option);
                    setValue(option.id);
                  }}
                  type="button"
                >
                  {option.id === value ? `✓ ${option.label}` : option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Choose the page type first.</p>
      )}
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  );
};
