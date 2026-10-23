using UnityEngine;

namespace EuroLife
{
    /// <summary>
    /// Builds a simple playable Paris-inspired block from primitive meshes.
    /// Attach to an empty GameObject in a new scene and press Play.
    /// Replace primitive buildings with licensed art assets as the project matures.
    /// </summary>
    public sealed class ParisPrototypeBuilder : MonoBehaviour
    {
        [SerializeField] private bool buildOnAwake = true;
        [SerializeField] private int buildingPairs = 5;
        [SerializeField] private float streetLength = 64f;
        [SerializeField] private float streetWidth = 12f;

        private void Awake()
        {
            if (buildOnAwake) Build();
        }

        [ContextMenu("Build Paris Prototype")]
        public void Build()
        {
            // Avoid duplicate generated content when rebuilding in the editor.
            Transform old = transform.Find("GeneratedParisBlock");
            if (old != null)
            {
#if UNITY_EDITOR
                if (!Application.isPlaying) DestroyImmediate(old.gameObject);
                else Destroy(old.gameObject);
#else
                Destroy(old.gameObject);
#endif
            }

            var root = new GameObject("GeneratedParisBlock").transform;
            root.SetParent(transform, false);

            Material road = MakeMaterial(new Color(0.18f, 0.19f, 0.20f));
            Material pavement = MakeMaterial(new Color(0.55f, 0.53f, 0.49f));
            Material cream = MakeMaterial(new Color(0.77f, 0.69f, 0.56f));
            Material pale = MakeMaterial(new Color(0.86f, 0.80f, 0.69f));
            Material roof = MakeMaterial(new Color(0.25f, 0.27f, 0.31f));
            Material window = MakeMaterial(new Color(0.19f, 0.35f, 0.46f));
            Material green = MakeMaterial(new Color(0.20f, 0.38f, 0.22f));
            Material white = MakeMaterial(new Color(0.88f, 0.84f, 0.72f));

            CreateBlock(root, "Road", new Vector3(0, -0.12f, 0),
                new Vector3(streetWidth, 0.2f, streetLength), road);
            CreateBlock(root, "Left Pavement", new Vector3(-streetWidth * 0.5f - 1.4f, -0.03f, 0),
                new Vector3(2.8f, 0.28f, streetLength), pavement);
            CreateBlock(root, "Right Pavement", new Vector3(streetWidth * 0.5f + 1.4f, -0.03f, 0),
                new Vector3(2.8f, 0.28f, streetLength), pavement);

            // Short dashed center markings.
            for (int z = -((int)streetLength / 2) + 3; z < streetLength / 2; z += 6)
                CreateBlock(root, "Road Marking", new Vector3(0, 0.001f, z),
                    new Vector3(0.12f, 0.025f, 2.2f), white);

            for (int i = 0; i < buildingPairs; i++)
            {
                float z = -streetLength * 0.5f + 5f + i * (streetLength - 8f) / Mathf.Max(1, buildingPairs - 1);
                float height = 8f + (i % 3) * 1.8f;
                CreateBuilding(root, "Left Paris Building " + i,
                    new Vector3(-streetWidth * 0.5f - 5.0f, height * 0.5f, z),
                    new Vector3(7f, height, 8f), i % 2 == 0 ? cream : pale, roof, window);
                CreateBuilding(root, "Right Paris Building " + i,
                    new Vector3(streetWidth * 0.5f + 5.0f, height * 0.5f, z + 2f),
                    new Vector3(7f, height, 8f), i % 2 == 0 ? pale : cream, roof, window);
            }

            // Simple street trees and café awning add recognizable street rhythm.
            for (int i = 0; i < 4; i++)
            {
                float z = -streetLength * 0.4f + i * 15f;
                CreateBlock(root, "Tree Trunk", new Vector3(-streetWidth * 0.5f - 2.1f, 1.0f, z),
                    new Vector3(0.35f, 2f, 0.35f), roof);
                GameObject crown = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                crown.name = "Tree Crown";
                crown.transform.SetParent(root, false);
                crown.transform.position = new Vector3(-streetWidth * 0.5f - 2.1f, 2.8f, z);
                crown.transform.localScale = new Vector3(2.1f, 2.0f, 2.1f);
                crown.GetComponent<Renderer>().sharedMaterial = green;
            }

            CreateBlock(root, "Cafe Front", new Vector3(streetWidth * 0.5f + 3.1f, 1.4f, -streetLength * 0.35f),
                new Vector3(0.25f, 2.8f, 5.2f), cream);
            CreateBlock(root, "Cafe Awning", new Vector3(streetWidth * 0.5f + 2.3f, 2.6f, -streetLength * 0.35f),
                new Vector3(1.8f, 0.25f, 5.4f), new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard")) { color = new Color(0.65f, 0.15f, 0.12f) });

            RenderSettings.ambientLight = new Color(0.58f, 0.61f, 0.66f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.66f, 0.73f, 0.79f);
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 45f;
            RenderSettings.fogEndDistance = 110f;
        }

        private static void CreateBuilding(Transform root, string name, Vector3 position,
            Vector3 size, Material wall, Material roof, Material glass)
        {
            CreateBlock(root, name, position, size, wall);
            CreateBlock(root, name + " Roof", position + Vector3.up * (size.y * 0.5f + 0.18f),
                new Vector3(size.x + 0.3f, 0.36f, size.z + 0.3f), roof);

            int floors = Mathf.Max(2, Mathf.FloorToInt(size.y / 2.4f));
            for (int floor = 0; floor < floors; floor++)
            {
                float y = 1.4f + floor * 2.2f;
                for (int side = -1; side <= 1; side++)
                {
                    CreateBlock(root, name + " Window", position + new Vector3(side * 1.8f, y - size.y * 0.5f, -size.z * 0.5f - 0.02f),
                        new Vector3(0.85f, 1.05f, 0.08f), glass);
                    CreateBlock(root, name + " Window", position + new Vector3(side * 1.8f, y - size.y * 0.5f, size.z * 0.5f + 0.02f),
                        new Vector3(0.85f, 1.05f, 0.08f), glass);
                }
            }
        }

        private static GameObject CreateBlock(Transform root, string name, Vector3 position,
            Vector3 size, Material material)
        {
            GameObject block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.SetParent(root, false);
            block.transform.localPosition = position;
            block.transform.localScale = size;
            block.GetComponent<Renderer>().sharedMaterial = material;
            return block;
        }

        private static Material MakeMaterial(Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            return new Material(shader) { color = color };
        }
    }
}
