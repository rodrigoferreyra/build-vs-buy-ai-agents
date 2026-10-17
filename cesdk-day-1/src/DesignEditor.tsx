import CreativeEditor from '@cesdk/cesdk-js/react';
import { initDesignEditor } from './imgly';
import { DEMO_ASSETS_BASE_URL } from './imgly/demo-assets';

const license = (import.meta.env.VITE_CESDK_LICENSE_KEY ||
  import.meta.env.VITE_CESDK_LICENSE) as string | undefined;
const CESDK_ASSETS =
  'https://cdn.img.ly/packages/imgly/cesdk-js/1.83.0/assets';

export default function DesignEditor() {
  return (
    <CreativeEditor
      config={{
        license: license || undefined,
        baseURL: CESDK_ASSETS,
        userId: 'cesdk-day-1-user',
      }}
      init={async (cesdk) => {
        await initDesignEditor(cesdk);
        await cesdk.load(
          `${DEMO_ASSETS_BASE_URL}/assets/4-5-marketing-ad/scene.scene`,
        );
      }}
      width="100vw"
      height="100vh"
    />
  );
}
