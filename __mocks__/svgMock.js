const React = require('react');
const { View } = require('react-native');
const SvgMock = (props) => React.createElement(View, props);
SvgMock.ReactComponent = SvgMock;
module.exports = SvgMock;
module.exports.default = SvgMock;
