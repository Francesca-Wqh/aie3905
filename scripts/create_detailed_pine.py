import bpy
import math
import os
import random
import sys
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB_PATH = os.path.join(ROOT, "assets", "trees", "pine.glb")
BLEND_PATH = os.path.join(ROOT, "assets", "trees", "source", "pine-detailed.blend")
PREVIEW_PATH = os.path.join(ROOT, "assets", "trees", "previews", "pine-detailed.png")

random.seed(3905)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def tube(points, radii, sides, verts, faces):
    start = len(verts)
    for i, point in enumerate(points):
        if i == 0:
            tangent = (points[1] - point).normalized()
        elif i == len(points) - 1:
            tangent = (point - points[i - 1]).normalized()
        else:
            tangent = (points[i + 1] - points[i - 1]).normalized()
        ref = Vector((0, 0, 1))
        if abs(tangent.dot(ref)) > 0.92:
            ref = Vector((1, 0, 0))
        axis_a = tangent.cross(ref).normalized()
        axis_b = tangent.cross(axis_a).normalized()
        wobble = 1.0 + 0.035 * math.sin(i * 2.7 + point.z * 8.0)
        for j in range(sides):
            angle = math.tau * j / sides
            offset = (axis_a * math.cos(angle) + axis_b * math.sin(angle)) * radii[i] * wobble
            verts.append(tuple(point + offset))
    for i in range(len(points) - 1):
        a = start + i * sides
        b = a + sides
        for j in range(sides):
            n = (j + 1) % sides
            faces.append((a + j, a + n, b + n, b + j))
    faces.append(tuple(start + j for j in reversed(range(sides))))
    end = start + (len(points) - 1) * sides
    faces.append(tuple(end + j for j in range(sides)))


def lance(center, direction, length, width, verts, faces):
    direction = direction.normalized()
    ref = Vector((0, 0, 1))
    if abs(direction.dot(ref)) > 0.9:
        ref = Vector((1, 0, 0))
    side = direction.cross(ref).normalized() * width
    base = center - direction * length * 0.18
    shoulder = center + direction * length * 0.30
    tip = center + direction * length * 0.82
    idx = len(verts)
    verts.extend((tuple(base), tuple(shoulder + side), tuple(tip), tuple(shoulder - side)))
    faces.extend(((idx, idx + 1, idx + 2), (idx, idx + 2, idx + 3)))


def mesh_object(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def branch_path(origin, angle, length, lift, droop=0.0):
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    side = Vector((-math.sin(angle), math.cos(angle), 0))
    points = []
    for i in range(5):
        t = i / 4
        sway = side * math.sin(t * math.pi) * length * random.uniform(-0.05, 0.05)
        z = lift * t - droop * math.sin(t * math.pi)
        points.append(origin + radial * length * t + sway + Vector((0, 0, z)))
    return points


def create_tree():
    bark = material("Bark - warm dark wood", (0.20, 0.105, 0.045), 0.96)
    bark_light = material("Bark highlights", (0.31, 0.17, 0.075), 0.92)
    needle_mats = [
        material("Needles - deep pine", (0.075, 0.19, 0.105), 0.82),
        material("Needles - pine", (0.12, 0.30, 0.16), 0.78),
        material("Needles - fresh tips", (0.25, 0.43, 0.22), 0.76),
    ]

    bark_verts, bark_faces = [], []
    detail_verts, detail_faces = [], []
    needle_data = [([], []) for _ in needle_mats]

    height = 2.5
    trunk_points = []
    trunk_radii = []
    for i in range(14):
        t = i / 13
        trunk_points.append(Vector((0.035 * math.sin(t * 5.5), 0.022 * math.sin(t * 8.1 + 0.8), t * height)))
        trunk_radii.append(0.145 * (1 - t) ** 0.72 + 0.018)
    tube(trunk_points, trunk_radii, 14, bark_verts, bark_faces)

    # Exposed roots make the tree feel planted rather than placed on the terrain.
    for i in range(9):
        angle = math.tau * i / 9 + random.uniform(-0.12, 0.12)
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        points = [Vector((0, 0, 0.12)), radial * 0.18 + Vector((0, 0, 0.055)), radial * random.uniform(0.32, 0.46)]
        tube(points, [0.075, 0.045, 0.008], 7, bark_verts, bark_faces)

    # Thin raised bark strips add the same kind of readable repetition as roof tiles.
    for i in range(12):
        angle = math.tau * i / 12
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        points = []
        for j in range(7):
            z = 0.08 + j * 0.25
            radius = 0.148 * (1 - z / height) ** 0.72 + 0.018
            points.append(radial * (radius + 0.006) + Vector((0, 0, z)))
        tube(points, [0.006] * len(points), 5, detail_verts, detail_faces)

    branch_number = 0
    for level in range(9):
        z = 0.48 + level * 0.215
        crown_t = level / 8
        branch_count = 7 if level < 5 else 6
        max_len = 0.76 * (1 - crown_t * 0.68) + 0.08
        for j in range(branch_count):
            angle = math.tau * j / branch_count + level * 0.73 + random.uniform(-0.10, 0.10)
            origin = Vector((0.018 * math.sin(z * 4), 0.014 * math.cos(z * 5), z))
            length = max_len * random.uniform(0.84, 1.06)
            lift = 0.10 + crown_t * 0.28 + random.uniform(-0.035, 0.04)
            path = branch_path(origin, angle, length, lift, droop=0.07 * (1 - crown_t))
            base_r = 0.038 * (1 - crown_t * 0.45)
            tube(path, [base_r, base_r * 0.83, base_r * 0.60, base_r * 0.35, 0.008], 7, bark_verts, bark_faces)

            radial = Vector((math.cos(angle), math.sin(angle), 0))
            side = Vector((-math.sin(angle), math.cos(angle), 0))
            # Secondary twigs create a layered silhouette.
            for twig_i, t in enumerate((0.34, 0.56, 0.76)):
                p = path[0].lerp(path[-1], t)
                twig_side = side * (1 if (twig_i + level + j) % 2 else -1)
                tip = p + radial * length * 0.18 + twig_side * length * 0.22 + Vector((0, 0, 0.10 + crown_t * 0.05))
                mid = p.lerp(tip, 0.55) + Vector((0, 0, 0.025))
                tube([p, mid, tip], [0.014, 0.009, 0.003], 5, bark_verts, bark_faces)

                for cluster_i in range(3):
                    center = mid.lerp(tip, cluster_i / 2) if cluster_i else mid
                    mat_index = (branch_number + twig_i + cluster_i) % len(needle_mats)
                    verts, faces = needle_data[mat_index]
                    axis = (tip - p).normalized()
                    for n in range(10):
                        around = math.tau * n / 10 + random.uniform(-0.16, 0.16)
                        outward = (axis + side * math.cos(around) * 0.72 + Vector((0, 0, math.sin(around) * 0.72))).normalized()
                        lance(center + outward * random.uniform(0.005, 0.025), outward, random.uniform(0.10, 0.15), 0.009, verts, faces)

            # Dense needle fans along the primary branch.
            for cluster_i in range(7):
                t = 0.25 + cluster_i * 0.105
                center = path[0].lerp(path[-1], t)
                mat_index = (branch_number + cluster_i) % len(needle_mats)
                verts, faces = needle_data[mat_index]
                axis = radial.lerp(Vector((0, 0, 1)), 0.12 + crown_t * 0.18).normalized()
                for n in range(12):
                    around = math.tau * n / 12 + random.uniform(-0.12, 0.12)
                    outward = (axis * 0.35 + side * math.cos(around) + Vector((0, 0, math.sin(around)))).normalized()
                    lance(center + outward * random.uniform(0.0, 0.018), outward, random.uniform(0.105, 0.16), 0.009, verts, faces)
            branch_number += 1

    # A fine vertical crown prevents a blunt cut-off at the top.
    for level in range(7):
        z = 1.75 + level * 0.105
        radius = 0.25 * (1 - level / 7) + 0.04
        for j in range(6):
            angle = math.tau * j / 6 + level * 0.55
            origin = Vector((0, 0, z))
            tip = Vector((math.cos(angle) * radius, math.sin(angle) * radius, z + 0.20))
            tube([origin, origin.lerp(tip, 0.55), tip], [0.018, 0.010, 0.003], 5, bark_verts, bark_faces)
            verts, faces = needle_data[(level + j) % 3]
            for n in range(14):
                around = math.tau * n / 14
                direction = Vector((math.cos(around) * 0.62, math.sin(around) * 0.62, 0.78)).normalized()
                lance(tip.lerp(origin, random.uniform(0.0, 0.45)), direction, random.uniform(0.10, 0.145), 0.008, verts, faces)

    objects = [
        mesh_object("Pine trunk and branches", bark_verts, bark_faces, bark),
        mesh_object("Raised bark detail", detail_verts, detail_faces, bark_light),
    ]
    for i, ((verts, faces), mat) in enumerate(zip(needle_data, needle_mats), 1):
        objects.append(mesh_object(f"Pine needles {i}", verts, faces, mat))
    for obj in objects:
        obj["aie3905_asset"] = "detailed_pine"
    return objects


def setup_preview(tree_objects):
    ground_mat = material("Preview ground", (0.78, 0.75, 0.66), 0.92)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.015))
    ground = bpy.context.object
    ground.name = "Preview ground - not exported"
    ground.data.materials.append(ground_mat)

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.78, 0.76, 0.70, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55

    bpy.ops.object.light_add(type="AREA", location=(-3.2, -3.4, 5.0))
    key = bpy.context.object
    key.name = "Preview key light"
    key.data.energy = 820
    key.data.shape = "DISK"
    key.data.size = 4.0
    key.rotation_euler = (math.radians(25), 0, math.radians(-38))

    bpy.ops.object.light_add(type="AREA", location=(3.4, 1.5, 2.7))
    fill = bpy.context.object
    fill.name = "Preview fill light"
    fill.data.energy = 390
    fill.data.size = 3.0
    fill.rotation_euler = (math.radians(65), 0, math.radians(130))

    bpy.ops.object.camera_add(location=(4.1, -5.0, 3.25))
    camera = bpy.context.object
    camera.name = "Preview camera"
    direction = Vector((0, 0, 1.3)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.35
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = PREVIEW_PATH
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.color_mode = "RGBA"
    return ground, key, fill, camera


def export_tree(tree_objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in tree_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = tree_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )


def main():
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(PREVIEW_PATH), exist_ok=True)
    clear_scene()
    tree_objects = create_tree()
    setup_preview(tree_objects)
    export_tree(tree_objects)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.context.scene.render.filepath = PREVIEW_PATH
    bpy.ops.render.render(write_still=True)
    vertices = sum(len(obj.data.vertices) for obj in tree_objects)
    polygons = sum(len(obj.data.polygons) for obj in tree_objects)
    print(f"DETAILED_PINE vertices={vertices} polygons={polygons}")
    print(f"GLB={GLB_PATH}")
    print(f"BLEND={BLEND_PATH}")
    print(f"PREVIEW={PREVIEW_PATH}")


if __name__ == "__main__":
    main()
