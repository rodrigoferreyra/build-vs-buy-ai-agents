import { useCallback, useRef, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js/react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { initDesignEditor } from './imgly';
import { DEMO_ASSETS_BASE_URL } from './imgly/demo-assets';

const license = (import.meta.env.VITE_CESDK_LICENSE_KEY ||
  import.meta.env.VITE_CESDK_LICENSE) as string | undefined;
const CESDK_ASSETS =
  'https://cdn.img.ly/packages/imgly/cesdk-js/1.83.0/assets';

type Role = 'Creator' | 'Adopter';
type Locale = 'en' | 'de';

export default function DesignEditor() {
  const cesdkRef = useRef<CreativeEditorSDK | null>(null);
  const [role, setRole] = useState<Role>('Creator');
  const [locale, setLocale] = useState<Locale>('en');

  const onRoleChange = useCallback((next: Role) => {
    setRole(next);
    cesdkRef.current?.engine.editor.setRole(next);
  }, []);

  const onLocaleChange = useCallback((next: Locale) => {
    setLocale(next);
    cesdkRef.current?.i18n.setLocale(next);
  }, []);

  return (
    <div className="cesdk-shell">
      <div className="cesdk-chrome" aria-label="Experiment controls">
        <span className="cesdk-chrome-label">cesdk-day-1</span>
        <label>
          Role{' '}
          <select
            value={role}
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
            onChange={(e) => onLocaleChange(e.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
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
            await cesdk.load(
              `${DEMO_ASSETS_BASE_URL}/assets/4-5-marketing-ad/scene.scene`,
            );
            cesdk.engine.editor.setRole(role);
            cesdk.i18n.setLocale(locale);
          }}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
