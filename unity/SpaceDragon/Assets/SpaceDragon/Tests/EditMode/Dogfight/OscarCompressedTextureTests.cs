using NUnit.Framework;
using SpaceDragon.Dogfight.Editor;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class OscarCompressedTextureTests
    {
        [Test] public void MissingOptionalMapsAreAbsentWhileTextureIndexZeroRemainsReal()
        {
            const string json="{\"materials\":[{\"name\":\"horn\",\"normalTexture\":{\"index\":0},\"occlusionTexture\":{\"index\":1},\"pbrMetallicRoughness\":{\"baseColorTexture\":{\"index\":2},\"metallicRoughnessTexture\":{\"index\":1}}}]}";
            Assert.AreEqual(new[] {2,1,0,1,-1},OscarCompressedTextures.InspectTextureReferences(json,"horn"));
        }
        [Test] public void PresentEmissiveMapIsNeverIgnoredAsAnOptionalDefault()
        {
            const string json="{\"materials\":[{\"name\":\"eye\",\"emissiveTexture\":{\"index\":0}}]}";
            Assert.AreEqual(new[] {-1,-1,-1,-1,0},OscarCompressedTextures.InspectTextureReferences(json,"eye"));
        }
    }
}
