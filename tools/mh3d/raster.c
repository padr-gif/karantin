// Растеризатор треугольников для рендера персонажей: z-буфер, номер треугольника и барицентрики на пиксель.
// Собирается автоматически из render.py: cc -O2 -shared -fPIC raster.c -o raster.so
#include <math.h>

// sv: nv*3 (x, y экрана в пикселях, глубина: меньше = ближе), tri: nt*3
void raster(int nt, const float *sv, const int *tri, int W, int H,
            float *zb, int *tid, float *b1, float *b2) {
  for (int t = 0; t < nt; t++) {
    const float *a = sv + 3 * tri[3 * t], *b = sv + 3 * tri[3 * t + 1], *c = sv + 3 * tri[3 * t + 2];
    float area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (fabsf(area) < 1e-12f) continue;
    int x0 = (int)floorf(fminf(a[0], fminf(b[0], c[0]))), x1 = (int)ceilf(fmaxf(a[0], fmaxf(b[0], c[0])));
    int y0 = (int)floorf(fminf(a[1], fminf(b[1], c[1]))), y1 = (int)ceilf(fmaxf(a[1], fmaxf(b[1], c[1])));
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > W - 1) x1 = W - 1; if (y1 > H - 1) y1 = H - 1;
    float ia = 1.0f / area;
    for (int y = y0; y <= y1; y++) {
      float py = y + 0.5f;
      for (int x = x0; x <= x1; x++) {
        float px = x + 0.5f;
        float w1 = ((px - a[0]) * (c[1] - a[1]) - (py - a[1]) * (c[0] - a[0])) * ia;
        float w2 = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) * ia;
        float w0 = 1.0f - w1 - w2;
        if (w0 < -1e-5f || w1 < -1e-5f || w2 < -1e-5f) continue;
        float z = w0 * a[2] + w1 * b[2] + w2 * c[2];
        int i = y * W + x;
        if (z < zb[i]) { zb[i] = z; tid[i] = t; b1[i] = w1; b2[i] = w2; }
      }
    }
  }
}
