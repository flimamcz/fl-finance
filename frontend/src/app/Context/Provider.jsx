import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import MyContext from "./Context";
function Provider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [typesTransactions, setTypesTransactions] = useState([]);

  const [amounts, setAmounts] = useState([]);

  const getAllTransactions = useCallback(async () => {
    try {
      let recipes = 0;
      let expenses = 0;
      let investiments = 0;
      const req = await fetch("http://localhost:3001/transactions");
      const data = await req.json();
      setTransactions(data);

      data.forEach((transaction) => {
        if (transaction.typeId === 1)
          recipes = recipes += Number(transaction.value);

        if (transaction.typeId === 2)
          expenses = expenses += Number(transaction.value);

        if (transaction.typeId === 3)
          investiments = investiments += Number(transaction.value);
      });

      setAmounts([
        {
          amount: recipes.toFixed(2),
          type: "RECIPES",
        },
        {
          amount: expenses.toFixed(2),
          type: "EXPENSES",
        },
        {
          amount: investiments.toFixed(2),
          type: "INVESTIMENTS",
        },
      ]);
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
      amounts,
    }),
    [transactions, getAllTransactions, typesTransactions, amounts]
  );

  return (
    <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>
  );
}

Provider.propTypes = {
  children: PropTypes.shape({}),
}.isRequired;

export default Provider;
