import { useCallback, useRef, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js/react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import {
  initDesignEditor,
  loadDesignDemo,
  loadVideoDemo,
} from './imgly';

const license = (import.meta.env.VITE_CESDK_LICENSE_KEY ||
  import.meta.env.VITE_CESDK_LICENSE) as string | undefined;
const CESDK_ASSETS =
  'https://cdn.img.ly/packages/imgly/cesdk-js/1.83.0/assets';

type Role = 'Creator' | 'Adopter';
type Locale = 'en' | 'de';
type EditorMode = 'design' | 'video';

export default function DesignEditor() {
  const cesdkRef = useRef<CreativeEditorSDK | null>(null);
  const [role, setRole] = useState<Role>('Creator');
  const [locale, setLocale] = useState<Locale>('en');
  const [mode, setMode] = useState<EditorMode>('design');
  const [varName, setVarName] = useState('Alex');
  const [varHeadline, setVarHeadline] = useState('Hello world');

  const onRoleChange = useCallback((next: Role) => {
    setRole(next);
    cesdkRef.current?.engine.editor.setRole(next);
  }, []);

  const onLocaleChange = useCallback((next: Locale) => {
    setLocale(next);
    cesdkRef.current?.i18n.setLocale(next);
  }, []);

  const onModeChange = useCallback(async (next: EditorMode) => {
    setMode(next);
    const cesdk = cesdkRef.current;
    if (!cesdk) return;
    if (next === 'video') {
      await loadVideoDemo(cesdk);
    } else {
      await loadDesignDemo(cesdk);
    }
  }, []);

  const applyVariables = useCallback(() => {
    const engine = cesdkRef.current?.engine;
    if (!engine) return;
    engine.variable.setString('name', varName);
    engine.variable.setString('headline', varHeadline);
  }, [varName, varHeadline]);

  const importCsvVariables = useCallback(async () => {
    const cesdk = cesdkRef.current;
    if (!cesdk) return;
    const text = (await cesdk.utils.loadFile({
      accept: '.csv,text/csv',
      returnType: 'text',
    })) as string;
    const [headerLine, firstRow] = text.trim().split(/\r?\n/);
    if (!headerLine || !firstRow) return;
    const headers = headerLine.split(',').map((h) => h.trim());
    const values = firstRow.split(',').map((v) => v.trim());
    headers.forEach((h, i) => {
      if (h) cesdk.engine.variable.setString(h, values[i] ?? '');
    });
    if (headers.includes('name')) setVarName(values[headers.indexOf('name')] ?? '');
    if (headers.includes('headline')) {
      setVarHeadline(values[headers.indexOf('headline')] ?? '');
    }
  }, []);

  return (
    <div className="cesdk-shell">
      <div className="cesdk-chrome" aria-label="Experiment controls">
        <span className="cesdk-chrome-label">cesdk-day-1</span>
        <label>
          Mode{' '}
          <select
            value={mode}
            aria-label="Editor mode"
            onChange={(e) => void onModeChange(e.target.value as EditorMode)}
          >
            <option value="design">Design</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label>
          Role{' '}
          <select
            value={role}
            aria-label="Editor role"
            onChange={(e) => onRoleChange(e.target.value as Role)}
          >
            <option value="Creator">Creator</option>
            <option value="Adopter">Adopter</option>
          </select>
        </label>
        <label>
          UI{' '}
          <select
            value={locale}
            aria-label="UI language"
            onChange={(e) => onLocaleChange(e.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
        <label>
          {'{name} '}
          <input
            aria-label="Variable name"
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            onBlur={applyVariables}
          />
        </label>
        <label>
          {'{headline} '}
          <input
            aria-label="Variable headline"
            value={varHeadline}
            onChange={(e) => setVarHeadline(e.target.value)}
            onBlur={applyVariables}
          />
        </label>
        <button type="button" onClick={applyVariables}>
          Apply vars
        </button>
        <button type="button" onClick={() => void importCsvVariables()}>
          CSV → vars
        </button>
        <button
          type="button"
          onClick={() => void cesdkRef.current?.actions.run('importCaptionsSrt')}
        >
          Import SRT
        </button>
      </div>
      <div className="cesdk-editor">
        <CreativeEditor
          config={{
            license: license || undefined,
            baseURL: CESDK_ASSETS,
            userId: 'cesdk-day-1-user',
          }}
          init={async (cesdk) => {
            cesdkRef.current = cesdk;
            await initDesignEditor(cesdk);
            if (mode === 'video') {
              await loadVideoDemo(cesdk);
            } else {
              await loadDesignDemo(cesdk);
            }
            cesdk.engine.editor.setRole(role);
            cesdk.i18n.setLocale(locale);
            cesdk.engine.variable.setString('name', varName);
            cesdk.engine.variable.setString('headline', varHeadline);
          }}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
