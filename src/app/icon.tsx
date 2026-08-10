import { ImageResponse } from 'next/og';

export const size     = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           32,
          height:          32,
          borderRadius:    8,
          background:      '#01411C',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        {/* Simple cross / medical plus symbol */}
        <div
          style={{
            position:  'relative',
            width:     16,
            height:    16,
            display:   'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Horizontal bar */}
          <div
            style={{
              position:        'absolute',
              width:           16,
              height:          5,
              borderRadius:    2,
              background:      'white',
            }}
          />
          {/* Vertical bar */}
          <div
            style={{
              position:        'absolute',
              width:           5,
              height:          16,
              borderRadius:    2,
              background:      'white',
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
