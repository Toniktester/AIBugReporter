const adf = {
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This is the description."
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Item 1"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

const extractText = (nodes) => nodes.map((n) => (n.text ? n.text : (n.content ? extractText(n.content) : ''))).join(' ');
const s_desc = extractText(adf.content);
console.log("Extracted:", s_desc);
