import bpy
import math
import os
import random
import sys
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import create_detailed_pine as common


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def frame(normal):
    normal = normal.normalized()
    ref = Vector((0, 0, 1))
    if abs(normal.dot(ref)) > 0.9:
        ref = Vector((1, 0, 0))
    axis_a = normal.cross(ref).normalized()
    axis_b = normal.cross(axis_a).normalized()
    return axis_a, axis_b


def curved_path(origin, direction, length, segments=5, bend=0.06):
    direction = direction.normalized()
    axis_a, axis_b = frame(direction)
    phase = random.uniform(0, math.tau)
    points = []
    for i in range(segments):
        t = i / (segments - 1)
        sway = axis_a * math.sin(t * math.pi) * bend * math.sin(phase)
        sway += axis_b * math.sin(t * math.pi) * bend * math.cos(phase)
        points.append(origin + direction * length * t + sway)
    return points


def maple_leaf(center, normal, up, size, verts, faces, vein_verts, vein_faces, anchor):
    radii = (1.0, 0.43, 0.76, 0.40, 0.82, 0.38, 0.70, 0.38, 0.82, 0.40, 0.76, 0.43)
    normal = normal.normalized()
    length_axis = up - normal * up.dot(normal)
    if length_axis.length < 0.01:
        _, length_axis = frame(normal)
    length_axis.normalize()
    width_axis = length_axis.cross(normal).normalized()
    idx = len(verts)
    # A shallow cup gives each leaf a readable silhouette without the old crossed-card bulk.
    verts.append(tuple(center + normal * size * 0.075))
    rim = []
    for i, radius in enumerate(radii):
        angle = math.tau * i / len(radii) + math.pi / 2
        ripple = normal * size * (0.018 + 0.018 * math.sin(angle * 3 + i * 0.7))
        point = center + width_axis * math.cos(angle) * size * radius + length_axis * math.sin(angle) * size * radius + ripple
        rim.append(point)
        verts.append(tuple(point))
    for i in range(len(radii)):
        faces.append((idx, idx + 1 + i, idx + 1 + (i + 1) % len(radii)))

    base = center - length_axis * size * 0.42
    tip = center + length_axis * size * 0.98 + normal * size * 0.012
    common.tube([anchor, anchor.lerp(base, 0.58), base], [0.0042, 0.0033, 0.0024], 5, vein_verts, vein_faces)
    common.tube([base, center + normal * size * 0.055, tip], [0.0026, 0.0020, 0.0010], 5, vein_verts, vein_faces)


def willow_leaf(anchor, center, direction, normal, length, width, verts, faces, petiole_verts, petiole_faces):
    direction = direction.normalized()
    normal = normal - direction * normal.dot(direction)
    if normal.length < 0.01:
        normal, _ = frame(direction)
    normal.normalize()
    side = direction.cross(normal).normalized()
    base = center - direction * length * 0.24
    tip = center + direction * length * 0.76
    idx = len(verts)
    ridge = center + normal * width * 0.18
    verts.extend((
        tuple(ridge),
        tuple(base),
        tuple(center - direction * length * 0.02 + side * width * 0.82),
        tuple(center + direction * length * 0.34 + side * width),
        tuple(tip),
        tuple(center + direction * length * 0.34 - side * width),
        tuple(center - direction * length * 0.02 - side * width * 0.82),
    ))
    for i in range(1, 7):
        faces.append((idx, idx + i, idx + (i % 6) + 1))
    common.tube([anchor, anchor.lerp(base, 0.58), base], [0.0028, 0.0020, 0.0012], 5, petiole_verts, petiole_faces)
    common.tube([base, ridge, tip], [0.0015, 0.0011, 0.0005], 4, petiole_verts, petiole_faces)


def blossom(center, normal, size, verts, faces):
    axis_a, axis_b = frame(normal)
    for petal in range(5):
        angle = math.tau * petal / 5
        radial = axis_a * math.cos(angle) + axis_b * math.sin(angle)
        side = axis_a * -math.sin(angle) + axis_b * math.cos(angle)
        inner = center + radial * size * 0.10
        middle = center + radial * size * 0.58
        tip = center + radial * size
        idx = len(verts)
        verts.extend((tuple(inner), tuple(middle + side * size * 0.34), tuple(tip), tuple(middle - side * size * 0.34)))
        faces.extend(((idx, idx + 1, idx + 2), (idx, idx + 2, idx + 3)))


def add_roots(bark_verts, bark_faces, count=8, reach=0.36):
    for i in range(count):
        angle = math.tau * i / count + random.uniform(-0.13, 0.13)
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        common.tube(
            [Vector((0, 0, 0.13)), radial * 0.18 + Vector((0, 0, 0.05)), radial * random.uniform(reach * 0.75, reach)],
            [0.07, 0.04, 0.006], 7, bark_verts, bark_faces,
        )


def add_bark_ridges(height, base_radius, verts, faces):
    for i in range(10):
        angle = math.tau * i / 10
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        points = []
        for j in range(7):
            z = 0.08 + j * min(0.24, height / 9)
            radius = base_radius * (1 - z / height) ** 0.7 + 0.012
            points.append(radial * (radius + 0.006) + Vector((0, 0, z)))
        common.tube(points, [0.005] * len(points), 5, verts, faces)


def create_maple():
    random.seed(39051)
    bark = common.material("Maple bark", (0.22, 0.105, 0.045), 0.96)
    bark_light = common.material("Maple bark ridges", (0.34, 0.18, 0.075), 0.92)
    leaf_mats = [
        common.material("Maple leaf deep red", (0.45, 0.115, 0.075), 0.86),
        common.material("Maple leaf red", (0.62, 0.19, 0.12), 0.84),
        common.material("Maple leaf warm red", (0.72, 0.285, 0.16), 0.82),
    ]
    vein_mat = common.material("Maple veins", (0.24, 0.075, 0.045), 0.94)
    bark_v, bark_f, ridge_v, ridge_f, vein_v, vein_f = [], [], [], [], [], []
    leaf_data = [([], []) for _ in leaf_mats]
    trunk_height = 2.08
    trunk = [Vector((0.038 * math.sin(i * 0.7), 0.030 * math.sin(i * 1.1), i / 12 * trunk_height)) for i in range(13)]
    common.tube(trunk, [0.122 * (1 - i / 12) ** 0.76 + 0.011 for i in range(13)], 14, bark_v, bark_f)
    add_roots(bark_v, bark_f, 9, 0.40)
    add_bark_ridges(trunk_height, 0.122, ridge_v, ridge_f)

    endpoints = []
    for level in range(5):
        z = 0.52 + level * 0.275
        branch_count = 6 if level < 3 else 5
        for j in range(branch_count):
            angle = math.tau * j / branch_count + level * 0.87 + random.uniform(-0.16, 0.16)
            crown_width = 1.0 - max(0, level - 2) * 0.12
            length = random.uniform(0.72, 1.02) * crown_width
            direction = Vector((math.cos(angle), math.sin(angle), random.uniform(0.24, 0.52))).normalized()
            origin = Vector((0, 0, z))
            path = curved_path(origin, direction, length, 6, 0.075)
            common.tube(path, [0.036, 0.030, 0.023, 0.015, 0.008, 0.0025], 7, bark_v, bark_f)
            for twig in range(3):
                t = 0.38 + twig * 0.19
                p = path[0].lerp(path[-1], t)
                side = Vector((-math.sin(angle), math.cos(angle), random.uniform(0.30, 0.68))).normalized()
                if (twig + j) % 2:
                    side.x *= -1
                    side.y *= -1
                tip = p + (direction * 0.22 + side * 0.30 + Vector((0, 0, 0.06))).normalized() * random.uniform(0.30, 0.44)
                twig_path = curved_path(p, tip - p, (tip - p).length, 4, 0.025)
                common.tube(twig_path, [0.013, 0.009, 0.005, 0.002], 5, bark_v, bark_f)
                endpoints.extend(twig_path[1:])
                for sub in range(2):
                    q = twig_path[1 + sub]
                    sub_dir = (side * (1 if sub else -1) + Vector((0, 0, 0.65))).normalized()
                    sub_tip = q + sub_dir * random.uniform(0.18, 0.26)
                    common.tube([q, q.lerp(sub_tip, 0.55), sub_tip], [0.006, 0.004, 0.0015], 5, bark_v, bark_f)
                    endpoints.extend((q, sub_tip))

    for index, point in enumerate(endpoints):
        # Leave deliberate air between clusters so branches and individual leaves remain readable.
        if index % 5 == 0 or random.random() < 0.18:
            continue
        leaf_count = 2 if index % 7 in (1, 4) else 1
        for cluster in range(leaf_count):
            offset = Vector((random.uniform(-0.055, 0.055), random.uniform(-0.055, 0.055), random.uniform(-0.025, 0.075)))
            center = point + offset
            outward = Vector((center.x, center.y, random.uniform(0.15, 0.55))).normalized()
            normal = Vector((random.uniform(-0.75, 0.75), random.uniform(-0.75, 0.75), random.uniform(0.30, 1.0))).normalized()
            up = (outward * 0.72 + Vector((0, 0, 0.40))).normalized()
            verts, faces = leaf_data[(index + cluster * 2) % 3]
            maple_leaf(center, normal, up, random.uniform(0.064, 0.096), verts, faces, vein_v, vein_f, point)

    objects = [common.mesh_object("Maple trunk and branches", bark_v, bark_f, bark), common.mesh_object("Maple raised bark", ridge_v, ridge_f, bark_light)]
    for i, ((verts, faces), mat) in enumerate(zip(leaf_data, leaf_mats), 1):
        objects.append(common.mesh_object(f"Maple leaves {i}", verts, faces, mat))
    objects.append(common.mesh_object("Maple veins", vein_v, vein_f, vein_mat))
    return objects


def create_flowering():
    random.seed(39052)
    bark = common.material("Flowering tree bark", (0.19, 0.095, 0.065), 0.96)
    bark_light = common.material("Flowering tree bark ridges", (0.36, 0.19, 0.13), 0.90)
    leaf_mats = [common.material("Young leaves", (0.18, 0.34, 0.13), 0.80), common.material("Deep leaves", (0.08, 0.22, 0.095), 0.84)]
    flower_mats = [common.material("Blossom blush", (0.92, 0.54, 0.61), 0.72), common.material("Blossom pale", (1.0, 0.78, 0.78), 0.70)]
    bark_v, bark_f, ridge_v, ridge_f = [], [], [], []
    leaf_data = [([], []) for _ in leaf_mats]
    flower_data = [([], []) for _ in flower_mats]

    trunk = [Vector((0.045 * math.sin(i * 0.82), 0.025 * math.cos(i * 0.66), i / 11 * 2.05)) for i in range(12)]
    common.tube(trunk, [0.145 * (1 - i / 11) ** 0.75 + 0.012 for i in range(12)], 14, bark_v, bark_f)
    add_roots(bark_v, bark_f, 8, 0.38)
    add_bark_ridges(2.05, 0.145, ridge_v, ridge_f)

    endpoints = []
    for level in range(6):
        z = 0.48 + level * 0.25
        branch_count = 5 if level < 4 else 4
        for j in range(branch_count):
            angle = math.tau * j / branch_count + level * 0.91 + random.uniform(-0.15, 0.15)
            direction = Vector((math.cos(angle), math.sin(angle), random.uniform(0.35, 0.72))).normalized()
            length = random.uniform(0.55, 0.82) * (1 - level * 0.035)
            origin = Vector((0, 0, z))
            path = curved_path(origin, direction, length, 5, 0.075)
            common.tube(path, [0.040, 0.031, 0.020, 0.010, 0.003], 7, bark_v, bark_f)
            for twig in range(4):
                t = 0.28 + twig * 0.17
                p = path[0].lerp(path[-1], t)
                tangent = (path[-1] - path[0]).normalized()
                side = Vector((-math.sin(angle), math.cos(angle), random.uniform(0.28, 0.75))).normalized()
                if (twig + level) % 2:
                    side *= -1
                    side.z = abs(side.z)
                tip = p + (tangent * 0.25 + side * 0.75).normalized() * random.uniform(0.25, 0.39)
                twig_path = curved_path(p, tip - p, (tip - p).length, 4, 0.035)
                common.tube(twig_path, [0.012, 0.008, 0.004, 0.0015], 5, bark_v, bark_f)
                endpoints.extend(twig_path[1:])

    for index, point in enumerate(endpoints):
        normal = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.2, 1))).normalized()
        leaf_verts, leaf_faces = leaf_data[index % 2]
        for leaf_i in range(2):
            direction = (normal + Vector((random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), random.uniform(-0.2, 0.4)))).normalized()
            common.lance(point + direction * 0.03, direction, random.uniform(0.10, 0.15), 0.025, leaf_verts, leaf_faces)
        for flower_i in range(2 + index % 2):
            offset = Vector((random.uniform(-0.075, 0.075), random.uniform(-0.075, 0.075), random.uniform(-0.045, 0.085)))
            verts, faces = flower_data[(index + flower_i) % 2]
            blossom(point + offset, normal, random.uniform(0.045, 0.065), verts, faces)

    objects = [common.mesh_object("Flowering trunk and branches", bark_v, bark_f, bark), common.mesh_object("Flowering raised bark", ridge_v, ridge_f, bark_light)]
    for i, ((verts, faces), mat) in enumerate(zip(leaf_data, leaf_mats), 1):
        objects.append(common.mesh_object(f"Flowering leaves {i}", verts, faces, mat))
    for i, ((verts, faces), mat) in enumerate(zip(flower_data, flower_mats), 1):
        objects.append(common.mesh_object(f"Blossoms {i}", verts, faces, mat))
    return objects


def create_willow():
    random.seed(39053)
    bark = common.material("Willow bark", (0.20, 0.13, 0.065), 0.96)
    bark_light = common.material("Willow bark ridges", (0.36, 0.25, 0.12), 0.92)
    leaf_mats = [
        common.material("Willow leaf shadow", (0.13, 0.30, 0.16), 0.86),
        common.material("Willow leaf green", (0.25, 0.43, 0.23), 0.84),
        common.material("Willow leaf tip", (0.39, 0.55, 0.31), 0.82),
    ]
    petiole_mat = common.material("Willow petioles", (0.22, 0.25, 0.10), 0.92)
    bark_v, bark_f, ridge_v, ridge_f, petiole_v, petiole_f = [], [], [], [], [], []
    leaf_data = [([], []) for _ in leaf_mats]

    trunk_height = 1.96
    trunk = []
    for i in range(13):
        t = i / 12
        trunk.append(Vector((0.16 * math.sin(t * 1.35), 0.06 * math.sin(t * 2.2), t * trunk_height)))
    common.tube(trunk, [0.132 * (1 - i / 12) ** 0.76 + 0.012 for i in range(13)], 14, bark_v, bark_f)
    add_roots(bark_v, bark_f, 9, 0.44)
    add_bark_ridges(trunk_height, 0.132, ridge_v, ridge_f)

    hanging_starts = []
    for level in range(5):
        z = 0.66 + level * 0.27
        count = 5 if level < 3 else 4
        for j in range(count):
            angle = math.tau * j / count + level * 0.76 + random.uniform(-0.12, 0.12)
            direction = Vector((math.cos(angle), math.sin(angle), random.uniform(0.28, 0.56))).normalized()
            length = random.uniform(0.68, 0.96) * (1 - level * 0.035)
            origin = Vector((0.12 * math.sin(z), 0, z))
            path = curved_path(origin, direction, length, 6, 0.085)
            common.tube(path, [0.039, 0.032, 0.024, 0.015, 0.008, 0.0025], 7, bark_v, bark_f)
            hanging_starts.extend((path[2], path[4], path[5]))

    for index, start in enumerate(hanging_starts):
        fall = random.uniform(0.62, 0.98)
        outward = Vector((start.x, start.y, 0)).normalized() if Vector((start.x, start.y, 0)).length else Vector((1, 0, 0))
        sideways = Vector((-outward.y, outward.x, 0))
        points = []
        bow = random.uniform(0.10, 0.19)
        sway = random.uniform(-0.075, 0.075)
        phase = random.uniform(0, math.tau)
        for k in range(12):
            t = k / 11
            points.append(start + outward * math.sin(t * math.pi) * bow + sideways * math.sin(t * math.pi * 1.35 + phase) * sway * t + Vector((0, 0, -fall * (0.72 * t + 0.28 * t * t))))
        common.tube(points, [0.0032 * (1 - k / 12) + 0.0006 for k in range(12)], 5, bark_v, bark_f)
        for k in range(2, 11):
            p = points[k]
            tangent = (points[k] - points[k - 1]).normalized()
            side = Vector((-outward.y, outward.x, random.uniform(-0.08, 0.12))).normalized()
            signs = (-1, 1)
            for leaf_i, sign in enumerate(signs):
                direction = (side * sign * 0.92 - tangent * 0.12 + Vector((0, 0, random.uniform(-0.10, 0.18)))).normalized()
                normal = (Vector((0, 0, 1)) + outward * random.uniform(-0.35, 0.35)).normalized()
                verts, faces = leaf_data[(index + k + leaf_i) % 3]
                length = random.uniform(0.12, 0.18)
                center = p + direction * length * 0.30
                willow_leaf(p, center, direction, normal, length, random.uniform(0.018, 0.027), verts, faces, petiole_v, petiole_f)

    objects = [common.mesh_object("Willow trunk branches and hanging twigs", bark_v, bark_f, bark), common.mesh_object("Willow raised bark", ridge_v, ridge_f, bark_light)]
    for i, ((verts, faces), mat) in enumerate(zip(leaf_data, leaf_mats), 1):
        objects.append(common.mesh_object(f"Willow leaves {i}", verts, faces, mat))
    objects.append(common.mesh_object("Willow petioles", petiole_v, petiole_f, petiole_mat))
    return objects


def setup_preview(output_path):
    ground_mat = common.material("Preview ground", (0.78, 0.75, 0.66), 0.92)
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
    bpy.context.object.data.energy = 820
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 4.0
    bpy.ops.object.light_add(type="AREA", location=(3.4, 1.5, 2.7))
    bpy.context.object.data.energy = 390
    bpy.context.object.data.size = 3.0
    bpy.ops.object.camera_add(location=(4.1, -5.0, 3.2))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 1.25)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.3
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = output_path
    scene.view_settings.look = "AgX - Medium High Contrast"


def build(species):
    common.clear_scene()
    creators = {"maple": create_maple, "willow": create_willow, "flowering": create_flowering}
    objects = creators[species]()
    for obj in objects:
        obj["aie3905_asset"] = "detailed_" + species
    glb_path = os.path.join(ROOT, "assets", "trees", species + ".glb")
    blend_path = os.path.join(ROOT, "assets", "trees", "source", species + "-detailed.blend")
    preview_path = os.path.join(ROOT, "assets", "trees", "previews", species + "-detailed.png")
    os.makedirs(os.path.dirname(blend_path), exist_ok=True)
    os.makedirs(os.path.dirname(preview_path), exist_ok=True)
    setup_preview(preview_path)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.context.scene.render.filepath = preview_path
    bpy.ops.render.render(write_still=True)
    vertices = sum(len(obj.data.vertices) for obj in objects)
    polygons = sum(len(obj.data.polygons) for obj in objects)
    print(f"DETAILED_{species.upper()} vertices={vertices} polygons={polygons} glb={glb_path}")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for species in args or ["maple", "willow", "flowering"]:
        build(species)
