import unittest
import sys
from pathlib import Path

# Ensure engine path is in sys.path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from tests.run_tests import TestCaptionLabPhase2Phase3
from tests.test_visual_qa import TestVisualAndAnimationQA
from tests.test_stress_and_benchmarks import TestStressAndProductionBenchmarks
from tests.test_project_persistence import TestProjectPersistence
from tests.test_milestone5_motion_engine import TestMilestone5MotionEngine
from tests.test_milestone5_ai_intelligence import TestMilestone5AIIntelligence
from tests.test_milestone5_design_and_presets import TestMilestone5DesignAndPresets

def suite():
    s = unittest.TestSuite()
    loader = unittest.TestLoader()
    s.addTests(loader.loadTestsFromTestCase(TestCaptionLabPhase2Phase3))
    s.addTests(loader.loadTestsFromTestCase(TestVisualAndAnimationQA))
    s.addTests(loader.loadTestsFromTestCase(TestStressAndProductionBenchmarks))
    s.addTests(loader.loadTestsFromTestCase(TestProjectPersistence))
    s.addTests(loader.loadTestsFromTestCase(TestMilestone5MotionEngine))
    s.addTests(loader.loadTestsFromTestCase(TestMilestone5AIIntelligence))
    s.addTests(loader.loadTestsFromTestCase(TestMilestone5DesignAndPresets))
    return s

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite())
    if not result.wasSuccessful():
        sys.exit(1)
