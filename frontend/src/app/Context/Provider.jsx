import PropTypes from "prop-types";
import { useMemo } from "react";
import MyContext from "./Context";

function Provider({ children }) {
  const contextValue = useMemo(() => ({}), []);

  return (
    <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>
  );
}

Provider.propTypes = {
  children: PropTypes.shape({}),
}.isRequired;

export default Provider;
