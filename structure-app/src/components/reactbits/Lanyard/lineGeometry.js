import { Vector3 } from 'three'

/** Keep MeshLine's existing triangulation, UVs and sampling; update only the
 * three moving attributes. setPoints recreates every CPU array and reuploads
 * indices/UVs/widths even though those never change during the swing. */
export function createLineUpdater(geometry, curve, divisions = 32) {
  const points = Array.from({ length: divisions + 1 }, () => new Vector3())
  for (let i = 0; i < points.length; i++) curve.getPoint(i / divisions, points[i])
  geometry.setPoints(points)
  const position = geometry.getAttribute('position')
  const previous = geometry.getAttribute('previous')
  const next = geometry.getAttribute('next')
  const write = (array, index, point) => {
    const offset = index * 6
    array[offset] = array[offset + 3] = point.x
    array[offset + 1] = array[offset + 4] = point.y
    array[offset + 2] = array[offset + 5] = point.z
  }
  return () => {
    for (let i = 0; i < points.length; i++) curve.getPoint(i / divisions, points[i])
    const end = points.length - 1
    const closed = points[0].equals(points[end])
    for (let i = 0; i <= end; i++) {
      write(position.array, i, points[i])
      write(previous.array, i, points[i === 0 ? (closed ? end - 1 : 0) : i - 1])
      write(next.array, i, points[i === end ? (closed ? 1 : end) : i + 1])
    }
    position.needsUpdate = previous.needsUpdate = next.needsUpdate = true
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
  }
}
