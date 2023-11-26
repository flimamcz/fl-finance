import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import MyContext from "./Context";
function Provider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [typesTransactions, setTypesTransactions] = useState([]);

  const getAllTransactions = useCallback(async () => {
    try {
      const req = await fetch("http://localhost:3001/transactions");
      const data = await req.json();
      setTransactions(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const getAllTypes = useCallback(async () => {
    try {
      const req = await fetch("http://localhost:3001/types");
      const data = await req.json();
      setTypesTransactions(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    getAllTransactions();
    getAllTypes();
  }, []);

  const contextValue = useMemo(
    () => ({
      transactions,
      getAllTransactions,
      typesTransactions,
    }),
    [transactions, getAllTransactions, typesTransactions]
  );

  return (
    <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>
  );
}

Provider.propTypes = {
  children: PropTypes.shape({}),
}.isRequired;

export default Provider;
