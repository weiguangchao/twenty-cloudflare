import { renderHook } from '@testing-library/react';
import { useDisplaySidePanelFooter } from '@/object-record/record-show/hooks/useDisplaySidePanelFooter';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
jest.mock('@/ui/layout/hooks/useWorkspaceSurface');
it.each(['main', 'side-panel'] as const)(
  'shows the record footer only in the %s surface',
  (type) => {
    jest.mocked(useWorkspaceSurface).mockReturnValue({
      type,
      instanceId: 'record',
      ownsRouteLocation: false,
    });
    const { result } = renderHook(() =>
      useDisplaySidePanelFooter({
        id: 'record',
        targetObjectNameSingular: 'person',
      }),
    );
    expect(result.current).toBe(type === 'side-panel');
  },
);
