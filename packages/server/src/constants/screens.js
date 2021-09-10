const { BUILTIN_ROLE_IDS } = require("@budibase/auth/roles")
const { BASE_LAYOUT_PROP_IDS } = require("./layouts")

exports.createHomeScreen = (app) => ({
  description: "",
  url: "",
  layoutId: BASE_LAYOUT_PROP_IDS.PRIVATE,
  props: {
    _id: "d834fea2-1b3e-4320-ab34-f9009f5ecc59",
    _component: "@budibase/standard-components/container",
    _styles: {
      normal: {},
      hover: {},
      active: {},
      selected: {},
    },
    _transition: "fade",
    _children: [
      {
        _id: "ef60083f-4a02-4df3-80f3-a0d3d16847e7",
        _component: "@budibase/standard-components/heading",
        _styles: {
          hover: {},
          active: {},
          selected: {},
        },
        text: `Welcome to ${app.name} 👋`,
        size: "M",
        align: "left",
        _instanceName: "Heading",
        _children: [],
      },
    ],
    _instanceName: "Home",
    direction: "column",
    hAlign: "stretch",
    vAlign: "top",
    size: "grow",
    gap: "M",
  },
  routing: {
    route: "/",
    roleId: BUILTIN_ROLE_IDS.BASIC,
  },
  name: "home-screen",
})
